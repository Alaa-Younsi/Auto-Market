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
  return data as string;
}

export async function getOrderByNumber(orderNumber: string) {
  const { data, error } = await supabase.rpc("get_order_by_number", {
    p_order_number: orderNumber,
  });
  if (error) throw error;
  return data;
}
