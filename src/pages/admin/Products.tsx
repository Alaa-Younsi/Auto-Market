import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/lib/supabase";
import { Price } from "@/components/ui/Price";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";

export default function AdminProducts() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { data: products = [], isLoading } = useProducts({ includeAll: true, search });

  async function handleDelete(id: string) {
    if (!confirm(t("admin_confirm_delete"))) return;
    await supabase.from("products").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("admin_products_title")}
        </h1>
        <Link to="/admin/products/new">
          <Button size="sm">
            <Plus size={16} />
            {t("admin_add")}
          </Button>
        </Link>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Input
          placeholder={t("admin_search_placeholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
      </div>

      <BentoPanel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-start text-xs text-muted">
              <th className="px-4 py-3 text-start font-semibold"></th>
              <th className="px-4 py-3 text-start font-semibold">{t("admin_product_name")}</th>
              <th className="hidden px-4 py-3 text-start font-semibold sm:table-cell">{t("admin_product_price")}</th>
              <th className="hidden px-4 py-3 text-start font-semibold sm:table-cell">{t("admin_product_stock")}</th>
              <th className="px-4 py-3 text-start font-semibold">{t("admin_product_status")}</th>
              <th className="px-4 py-3 text-end font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  {t("loading")}
                </td>
              </tr>
            )}
            {products.map((product) => (
              <tr key={product.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2">
                  <div className="h-10 w-10 overflow-hidden rounded-lg bg-panel-2">
                    {product.product_images?.[0] && (
                      <img
                        src={product.product_images[0].url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {lang === "ar" ? product.name_ar : product.name_fr}
                  <span className="block text-xs text-muted sm:hidden">
                    <Price value={product.price} /> · {product.stock} pcs
                  </span>
                </td>
                <td className="hidden px-4 py-2 sm:table-cell"><Price value={product.price} /></td>
                <td className="hidden px-4 py-2 sm:table-cell">{product.stock}</td>
                <td className="px-4 py-2">
                  <Badge tone={product.status === "active" ? "accent" : "muted"}>
                    {product.status === "active"
                      ? t("admin_product_status_active")
                      : t("admin_product_status_draft")}
                  </Badge>
                </td>
                <td className="px-4 py-2 text-end">
                  <div className="flex justify-end gap-1">
                    <Link
                      to={`/admin/products/${product.id}`}
                      className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-brand"
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </BentoPanel>
    </div>
  );
}
