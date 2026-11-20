import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { normalizePromotion, type Promotion, type PromotionInput } from "@/lib/promotions";

const COLUMNS =
  "id,name,type,active,priority,starts_at,ends_at,scope,category_ids,product_ids,buy_qty,get_qty,percent,pack_items,pack_price,label_fr,label_ar,created_at,updated_at";

/**
 * Live campaigns, for labels and the instant cart mirror. Anon RLS only
 * returns rows that are active AND inside their date window. A failure (table
 * not migrated, network) means "no campaigns", never a broken page.
 */
export function useLivePromotions() {
  return useQuery({
    queryKey: ["promotions", "live"],
    queryFn: async (): Promise<Promotion[]> => {
      const { data, error } = await supabase
        .from("promotions")
        .select(COLUMNS)
        .eq("active", true)
        .order("priority", { ascending: false });
      if (error) return [];
      return (data ?? []).map((r) => normalizePromotion(r as Record<string, unknown>));
    },
    staleTime: 5 * 60_000,
    retry: 0,
  });
}

export function useAllPromotionsAdmin() {
  return useQuery({
    queryKey: ["promotions", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select(COLUMNS)
        .order("active", { ascending: false })
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => normalizePromotion(r as Record<string, unknown>));
    },
    retry: 0,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["promotions"] });
  qc.invalidateQueries({ queryKey: ["cart-quote"] });
}

export function useSavePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string | null; input: PromotionInput }) => {
      const query = id
        ? supabase.from("promotions").update(input).eq("id", id).select("id")
        : supabase.from("promotions").insert(input).select("id");
      const { data, error } = await query;
      if (error) throw error;
      if (!data?.length) throw new Error("not saved");
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from("promotions").delete().eq("id", id).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("not deleted");
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useTogglePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from("promotions")
        .update({ active })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("not saved");
    },
    onSuccess: () => invalidate(qc),
  });
}
