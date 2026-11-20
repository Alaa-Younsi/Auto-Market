import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useDeleteLanding, useLandingsAdmin } from "@/hooks/useLandings";
import { useProducts } from "@/hooks/useProducts";
import { readDbError } from "@/lib/dbError";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { LinkButton } from "@/components/ui/LinkButton";
import { SmartImage } from "@/components/ui/SmartImage";
import type { ProductLanding } from "@/lib/landing";

export const SITE_ORIGIN = "https://www.auto-market.shop";

export default function AdminLandings() {
  const { t, lang } = useLanguage();
  const { data: landings = [], isLoading, isError, error } = useLandingsAdmin();
  const { data: products = [] } = useProducts({ includeAll: true });
  const del = useDeleteLanding();
  const [toDelete, setToDelete] = useState<ProductLanding | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const missingTable = isError && ["42P01", "PGRST205"].includes(readDbError(error).code);

  async function copy(slug: string) {
    try {
      await navigator.clipboard.writeText(`${SITE_ORIGIN}/lp/${slug}`);
      setCopied(slug);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked: the link is visible on the card anyway */
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{t("lp_admin_title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t("lp_admin_intro")}</p>
        </div>
        {!missingTable && (
          <LinkButton to="/admin/landings/new" size="sm" className="self-start">
            <Plus size={16} />
            {t("lp_admin_new")}
          </LinkButton>
        )}
      </div>

      {missingTable && (
        <p className="mb-4 rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-500">
          {t("settings_missing_migration")}
        </p>
      )}
      {isLoading && <p className="text-muted">{t("loading")}</p>}
      {!isLoading && !isError && landings.length === 0 && (
        <BentoPanel className="p-8 text-center text-sm text-muted">
          {t("lp_admin_empty")}
        </BentoPanel>
      )}

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {landings.map((l) => {
          const p = products.find((x) => x.id === l.product_id);
          const img = l.hero_image_url ?? p?.product_images?.[0]?.url ?? null;
          const productOff = p && p.status !== "active";
          return (
            <li key={l.id}>
              <BentoPanel className="flex h-full gap-3 p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-panel-2">
                  {img && (
                    <SmartImage
                      src={img}
                      alt=""
                      sizes="80px"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px] font-bold",
                        l.status === "published"
                          ? "border-accent/30 bg-accent/10 text-accent"
                          : "border-line bg-panel-2 text-muted"
                      )}
                    >
                      {t(l.status === "published" ? "lp_status_published" : "lp_status_draft")}
                    </span>
                    {productOff && (
                      <span className="text-[11px] font-semibold text-amber-500">
                        {t("lp_product_inactive")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate font-semibold text-ink">
                    {(lang === "ar" ? l.headline_ar : l.headline_fr) ||
                      (p ? (lang === "ar" ? p.name_ar : p.name_fr) : "—")}
                  </p>
                  <p className="truncate font-mono text-xs text-muted" dir="ltr">
                    /lp/{l.slug}
                  </p>
                  <div className="mt-auto flex flex-wrap justify-end gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => copy(l.slug)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted hover:bg-panel-2 hover:text-ink"
                    >
                      <Copy size={14} />
                      {copied === l.slug ? t("lp_copied") : t("lp_copy_link")}
                    </button>
                    <a
                      href={`/lp/${l.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-ink"
                      aria-label={t("legal_view_page")}
                    >
                      <ExternalLink size={16} />
                    </a>
                    <Link
                      to={`/admin/landings/${l.id}`}
                      className="rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-brand"
                      aria-label={t("lp_admin_edit")}
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        del.reset();
                        setToDelete(l);
                      }}
                      className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-500"
                      aria-label={t("admin_delete")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </BentoPanel>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={toDelete !== null}
        title={`${t("lp_admin_delete")} /lp/${toDelete?.slug ?? ""}`}
        confirmLabel={t("admin_delete")}
        busy={del.isPending}
        error={del.isError ? t("admin_delete_error") : null}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await del.mutateAsync(toDelete.id);
            setToDelete(null);
          } catch {
            /* shown in the dialog */
          }
        }}
        onClose={() => setToDelete(null)}
      >
        <p>{t("lp_admin_delete_body")}</p>
      </ConfirmDialog>
    </div>
  );
}
