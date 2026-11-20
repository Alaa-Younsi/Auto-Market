import type { QueryClient } from "@tanstack/react-query";
import type { TranslationKey } from "@/i18n/translations";
import { readDbError } from "@/lib/dbError";
import { invalidateProductCaches } from "@/lib/queryCache";
import { supabase } from "@/lib/supabase";
import type { OrderStatus } from "@/types/db";

/**
 * The pipeline, in the order the team works it. Every board, section and
 * picker iterates THIS array — never Object.keys() of a record.
 */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
] as const satisfies readonly OrderStatus[];

export const ORDER_STATUS_LABEL_KEY: Record<OrderStatus, TranslationKey> = {
  pending: "track_status_pending",
  confirmed: "track_status_confirmed",
  shipped: "track_status_shipped",
  delivered: "track_status_delivered",
  cancelled: "track_status_cancelled",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, "brand" | "accent" | "muted" | "danger"> = {
  pending: "muted",
  confirmed: "brand",
  shipped: "brand",
  delivered: "accent",
  cancelled: "danger",
};

/** Dot colour per status (board tiles, cards). */
export const ORDER_STATUS_DOT: Record<OrderStatus, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-sky-400",
  shipped: "bg-brand",
  delivered: "bg-accent",
  cancelled: "bg-red-500",
};

function invalidateOrders(qc: QueryClient, id: string) {
  qc.invalidateQueries({ queryKey: ["orders"] });
  qc.invalidateQueries({ queryKey: ["order", id] });
}

/**
 * Status change. Cancelling restocks and re-opening re-reserves (trigger), so
 * product caches move too. Returns a translation key on failure.
 */
export async function updateOrderStatus(
  qc: QueryClient,
  id: string,
  status: OrderStatus
): Promise<TranslationKey | null> {
  const { data, error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("id");
  if (error) {
    return readDbError(error).message.includes("ERR_STOCK")
      ? "admin_order_reopen_stock"
      : "admin_save_error";
  }
  // RLS filters silently: zero rows back means nothing was written.
  if (!data || data.length === 0) return "admin_save_error";
  invalidateOrders(qc, id);
  invalidateProductCaches(qc);
  return null;
}

/**
 * Deletes ONE order (its lines cascade). Stock is not returned — the dialog
 * says so, and cancelling first is the way to put units back.
 */
export async function deleteOrder(qc: QueryClient, id: string): Promise<TranslationKey | null> {
  const { data, error } = await supabase.from("orders").delete().eq("id", id).select("id");
  if (error || !data || data.length === 0) return "admin_delete_error";
  qc.invalidateQueries({ queryKey: ["orders"] });
  qc.removeQueries({ queryKey: ["order", id] });
  return null;
}
