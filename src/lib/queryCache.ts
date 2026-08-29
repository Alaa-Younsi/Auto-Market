import type { QueryClient } from "@tanstack/react-query";

/**
 * One product row lives under several React Query keys — the admin list, every
 * filtered storefront list, the single-product page, and the related-products
 * rail. Invalidating only the admin list leaves the storefront serving the old
 * price for the rest of the session ("it saved but the site didn't change").
 * Call this from every product write.
 */
export function invalidateProductCaches(qc: QueryClient): void {
  for (const key of [
    ["products"],
    ["product"],
    ["products-count"],
    ["admin-products"],
    ["admin-products-count"],
    ["related-products"],
  ]) {
    qc.invalidateQueries({ queryKey: key });
  }
}

/**
 * Taxonomy edits (categories) must also bust the product caches, because the
 * product listings embed `category:categories(*)`.
 */
export function invalidateTaxonomyCaches(qc: QueryClient): void {
  qc.invalidateQueries({ queryKey: ["categories"] });
  invalidateProductCaches(qc);
}
