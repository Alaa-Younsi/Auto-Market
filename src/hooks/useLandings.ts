import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { normalizeProduct } from "@/hooks/useProducts";
import {
  LANDING_COLUMNS,
  normalizeLanding,
  type ProductLanding,
  type ProductLandingInput,
} from "@/lib/landing";
import type { Product } from "@/types/db";

/**
 * Public page data. Anon RLS returns published pages only (a signed-in admin
 * also sees drafts — that is the preview). The product comes back only if it
 * is active, so a drafted product takes its landing page down with it.
 */
export function useLandingPage(slug: string | undefined) {
  return useQuery({
    queryKey: ["landing", slug],
    enabled: !!slug,
    retry: 0,
    queryFn: async (): Promise<{ landing: ProductLanding; product: Product } | null> => {
      const { data, error } = await supabase
        .from("product_landings")
        .select(LANDING_COLUMNS)
        .eq("slug", slug as string)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const landing = normalizeLanding(data as Record<string, unknown>);
      const { data: product, error: pError } = await supabase
        .from("products")
        .select("*, product_images(*), category:categories(*)")
        .order("sort_order", { referencedTable: "product_images" })
        .eq("id", landing.product_id)
        .eq("status", "active")
        .maybeSingle();
      if (pError) throw pError;
      if (!product) return null;
      return { landing, product: normalizeProduct(product) };
    },
  });
}

export function useLandingsAdmin() {
  return useQuery({
    queryKey: ["landings", "admin"],
    retry: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_landings")
        .select(LANDING_COLUMNS)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => normalizeLanding(r as Record<string, unknown>));
    },
  });
}

export function useLandingAdmin(id: string | undefined) {
  return useQuery({
    queryKey: ["landings", "one", id],
    enabled: !!id,
    retry: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_landings")
        .select(LANDING_COLUMNS)
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeLanding(data as Record<string, unknown>) : null;
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["landings"] });
  qc.invalidateQueries({ queryKey: ["landing"] });
}

export function useSaveLanding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string | null; input: ProductLandingInput }) => {
      const query = id
        ? supabase.from("product_landings").update(input).eq("id", id).select("id")
        : supabase.from("product_landings").insert(input).select("id");
      const { data, error } = await query;
      if (error) throw error;
      if (!data?.length) throw new Error("not saved");
      return (data[0] as { id: string }).id;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteLanding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("product_landings")
        .delete()
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("not deleted");
    },
    onSuccess: () => invalidate(qc),
  });
}
