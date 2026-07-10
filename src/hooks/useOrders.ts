import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Order, OrderStatus } from "@/types/db";

interface UseOrdersOptions {
  status?: OrderStatus | "all";
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { status = "all" } = options;
  return useQuery({
    queryKey: ["orders", status],
    queryFn: async (): Promise<Order[]> => {
      let query = supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (status !== "all") {
        query = query.eq("status", status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
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
        .single();
      if (error) throw error;

      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);
      if (itemsError) throw itemsError;

      return { order, items: items ?? [] };
    },
    enabled: !!id,
  });
}
