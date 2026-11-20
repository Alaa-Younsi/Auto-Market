import { supabase } from "@/lib/supabase";
import type { PlaceOrderCustomer, PlaceOrderItem } from "@/types/db";

export async function placeOrder(
  items: PlaceOrderItem[],
  customer: PlaceOrderCustomer
): Promise<string> {
  const { data, error } = await supabase.rpc("place_order", {
    items,
    customer,
  });
  if (error) throw error;
  const orderNumber = data as string;
  notifyNewOrder(orderNumber);
  return orderNumber;
}

/**
 * Fire-and-forget: e-mails the team (edge function `notify`). Never awaited,
 * never surfaced — a mail problem must not touch the customer's order, which
 * is already saved at this point.
 */
function notifyNewOrder(orderNumber: string): void {
  supabase.functions
    .invoke("notify", { body: { kind: "order", order_number: orderNumber } })
    .catch(() => {
      /* logged by the function itself */
    });
}

export async function getOrderByNumber(orderNumber: string) {
  const { data, error } = await supabase.rpc("get_order_by_number", {
    p_order_number: orderNumber,
  });
  if (error) throw error;
  return data;
}
