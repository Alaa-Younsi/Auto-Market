import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sanitizeOffers } from "@/lib/offers";
import { sanitizeSearchTerm } from "@/lib/utils";
import type { Product } from "@/types/db";

/* Normalizes rows from PostgREST: offers jsonb parsed defensively, and the
   column may not exist yet on a DB that hasn't run migration 0005. */
function normalizeProduct(row: Product): Product {
  return {
    ...row,
    video_url: row.video_url ?? null,
    quantity_offers: sanitizeOffers(row.quantity_offers),
  };
}

interface UseProductsOptions {
  categoryId?: string;
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  featuredOnly?: boolean;
  includeAll?: boolean; // admin: include drafts
}

export function useProducts(options: UseProductsOptions = {}) {
  const { categoryId, search, sort = "newest", featuredOnly, includeAll } = options;

  return useQuery({
    queryKey: ["products", categoryId, search, sort, featuredOnly, includeAll],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from("products")
        .select("*, product_images(*), category:categories(*)");

      if (!includeAll) {
        query = query.eq("status", "active");
      }
      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }
      if (featuredOnly) {
        query = query.eq("featured", true);
      }
      if (search && search.trim()) {
        const safe = sanitizeSearchTerm(search.trim());
        if (safe) {
          query = query.or(`name_fr.ilike.%${safe}%,name_ar.ilike.%${safe}%`);
        }
      }

      if (sort === "price_asc") {
        query = query.order("price", { ascending: true });
      } else if (sort === "price_desc") {
        query = query.order("price", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(normalizeProduct);
    },
  });
}

/** How many products the storefront actually lists. Head-only: counts rows, transfers none. */
export function useProductsCount() {
  return useQuery({
    queryKey: ["products-count"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), category:categories(*)")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      return data ? normalizeProduct(data) : null;
    },
    enabled: !!slug,
  });
}
