import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Order, OrderItem } from "@/types/db";

/** One query feeds the whole orders desk and the dashboard. */
export const ORDERS_LIMIT = 500;

export interface OrdersResult {
  rows: Order[];
  /** True when the table holds more than ORDERS_LIMIT rows — every total on
      screen is then computed from a partial list and must say so. */
  capped: boolean;
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async (): Promise<OrdersResult> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(ORDERS_LIMIT + 1);
      if (error) throw error;
      const rows = (data ?? []).map((o: Order) => ({
        ...o,
        subtotal: Number(o.subtotal),
        shipping: Number(o.shipping),
        discount: Number(o.discount),
        total: Number(o.total),
      }));
      return { rows: rows.slice(0, ORDERS_LIMIT), capped: rows.length > ORDERS_LIMIT };
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      if (!id) return null;
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!order) return null;

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);
      if (itemsError) throw itemsError;

      // `variants` may not exist yet on a DB that hasn't run migration 0009.
      const normalizedItems = (items ?? []).map((item: OrderItem) => ({
        ...item,
        variants: item.variants ?? [],
      }));

      return { order: order as Order, items: normalizedItems };
    },
    enabled: !!id,
  });
}
