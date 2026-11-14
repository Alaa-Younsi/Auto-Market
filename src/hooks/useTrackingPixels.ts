import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TrackingPixel, TrackingPixelInput } from "@/types/db";

/** Storefront: the active pixels (RLS returns only active rows to anon). */
export function useActivePixels() {
  return useQuery({
    queryKey: ["tracking-pixels", "active"],
    queryFn: async (): Promise<TrackingPixel[]> => {
      const { data, error } = await supabase
        .from("tracking_pixels")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    // Campaign config changes rarely and every page mounts this.
    staleTime: 60 * 60_000,
    // A database without the migration degrades to "no pixels", quietly.
    retry: 0,
  });
}

export function useAllPixelsAdmin() {
  return useQuery({
    queryKey: ["tracking-pixels", "admin"],
    queryFn: async (): Promise<TrackingPixel[]> => {
      const { data, error } = await supabase
        .from("tracking_pixels")
        .select("*")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    retry: 0,
  });
}

export function useSavePixel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string | null; values: TrackingPixelInput }) => {
      const { error } = id
        ? await supabase.from("tracking_pixels").update(values).eq("id", id)
        : await supabase.from("tracking_pixels").insert(values);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracking-pixels"] }),
  });
}

export function useDeletePixel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tracking_pixels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tracking-pixels"] }),
  });
}
