import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { StoreSettings } from "@/types/db";

/**
 * The store's shipping rules. place_order applies these server-side; the
 * checkout UI reads them so the total it shows is the total actually charged.
 */
export function useStoreSettings() {
  return useQuery({
    queryKey: ["store-settings"],
    queryFn: async (): Promise<StoreSettings | null> => {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Mirror of the shipping branch in place_order: free above the threshold, on
 * what the customer actually pays for goods (after quantity offers).
 *
 * Kept in one place so the two checkout screens cannot drift apart from each
 * other — or from the RPC, which is the only figure that is really charged.
 */
export function resolveShipping(
  wilayaPrice: number | undefined,
  goodsTotal: number,
  settings: StoreSettings | null | undefined
): number {
  if (wilayaPrice === undefined) return 0;
  const threshold = settings?.free_ship_threshold;
  if (threshold != null && goodsTotal >= threshold) return 0;
  return wilayaPrice;
}
