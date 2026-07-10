import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DeliveryPrice } from "@/types/db";

export function useDeliveryPrices(options: { activeOnly?: boolean } = {}) {
  const { activeOnly = true } = options;
  return useQuery({
    queryKey: ["delivery-prices", activeOnly],
    queryFn: async (): Promise<DeliveryPrice[]> => {
      let query = supabase.from("delivery_prices").select("*").order("wilaya");
      if (activeOnly) {
        query = query.eq("active", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}
