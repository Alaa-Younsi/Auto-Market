import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useSeo } from "@/hooks/useSeo";
import { ProductCard } from "@/components/product/ProductCard";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";

export default function Shop() {
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const categoryId = searchParams.get("category") ?? "";
  const sort = (searchParams.get("sort") as "newest" | "price_asc" | "price_desc") ?? "newest";

  const { data: categories = [] } = useCategories();
  const { data: products = [], isLoading } = useProducts({
    categoryId: categoryId || undefined,
    search,
    sort,
  });

  useSeo({ title: `${t("shop_title")} — ${t("brand_name")}` });

  const activeCategoryName = useMemo(() => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? (lang === "ar" ? cat.name_ar : cat.name_fr) : t("shop_filter_all");
  }, [categories, categoryId, lang, t]);

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-extrabold text-ink">{t("shop_title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {isLoading ? t("loading") : `${products.length} ${t("shop_results_count")}`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[240px_1fr]">
        {/* Sidebar filters */}
        <aside className="space-y-6">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("nav_search_placeholder")}
              className="w-full rounded-xl border border-line bg-panel py-2.5 ps-10 pe-4 text-sm outline-none focus:border-brand"
            />
            <Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" />
          </div>

          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
              <SlidersHorizontal size={15} />
              {t("shop_filter_category")}
            </h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => updateParam("category", "")}
                className={cn(
                  "rounded-lg px-3 py-2 text-start text-sm transition-colors",
                  !categoryId ? "bg-brand/10 font-semibold text-brand" : "text-muted hover:bg-panel-2"
                )}
              >
                {t("shop_filter_all")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => updateParam("category", cat.id)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-start text-sm transition-colors",
                    categoryId === cat.id
                      ? "bg-brand/10 font-semibold text-brand"
                      : "text-muted hover:bg-panel-2"
                  )}
                >
                  {lang === "ar" ? cat.name_ar : cat.name_fr}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Products grid */}
        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink">{activeCategoryName}</p>
            <Select
              value={sort}
              onChange={(e) => updateParam("sort", e.target.value)}
              className="w-auto"
            >
              <option value="newest">{t("shop_sort_newest")}</option>
              <option value="price_asc">{t("shop_sort_price_asc")}</option>
              <option value="price_desc">{t("shop_sort_price_desc")}</option>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="fx-shimmer aspect-square rounded-2xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line py-20 text-center text-muted">
              {t("shop_no_results")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {products.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
