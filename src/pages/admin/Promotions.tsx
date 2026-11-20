import { type FormEvent, useMemo, useState } from "react";
import {
  BadgePercent,
  CalendarClock,
  Gift,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import {
  useAllPromotionsAdmin,
  useDeletePromotion,
  useSavePromotion,
  useTogglePromotion,
} from "@/hooks/usePromotions";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import {
  type PackItem,
  type Promotion,
  type PromotionInput,
  type PromotionScope,
  type PromotionType,
  promotionLabel,
} from "@/lib/promotions";
import { readDbError } from "@/lib/dbError";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Field, FormSection } from "@/components/admin/Field";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Price } from "@/components/ui/Price";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";

const TYPES: {
  type: PromotionType;
  icon: typeof Gift;
  title: TranslationKey;
  text: TranslationKey;
}[] = [
  { type: "buy_x_get_y", icon: Gift, title: "promo_type_bxgy", text: "promo_type_bxgy_text" },
  {
    type: "buy_x_percent",
    icon: BadgePercent,
    title: "promo_type_bxp",
    text: "promo_type_bxp_text",
  },
  {
    type: "category_percent",
    icon: CalendarClock,
    title: "promo_type_pct",
    text: "promo_type_pct_text",
  },
  { type: "pack", icon: Package, title: "promo_type_pack", text: "promo_type_pack_text" },
];

interface FormState {
  name: string;
  type: PromotionType;
  active: boolean;
  priority: string;
  starts_at: string;
  ends_at: string;
  scope: PromotionScope;
  category_ids: string[];
  product_ids: string[];
  buy_qty: string;
  get_qty: string;
  percent: string;
  pack_items: PackItem[];
  pack_price: string;
  label_fr: string;
  label_ar: string;
}

/** ISO → value of a datetime-local input, in the admin's own time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

function toForm(p: Promotion | null): FormState {
  return {
    name: p?.name ?? "",
    type: p?.type ?? "category_percent",
    active: p?.active ?? true,
    priority: String(p?.priority ?? 0),
    starts_at: toLocalInput(p?.starts_at ?? null),
    ends_at: toLocalInput(p?.ends_at ?? null),
    scope: p?.scope ?? "all",
    category_ids: p?.category_ids ?? [],
    product_ids: p?.product_ids ?? [],
    buy_qty: p && p.buy_qty > 0 ? String(p.buy_qty) : "",
    get_qty: p && p.get_qty > 0 ? String(p.get_qty) : "",
    percent: p && p.percent > 0 ? String(p.percent) : "",
    pack_items: p?.pack_items.length ? p.pack_items : [{ product_id: "", quantity: 1 }],
    pack_price: p?.pack_price != null ? String(p.pack_price) : "",
    label_fr: p?.label_fr ?? "",
    label_ar: p?.label_ar ?? "",
  };
}

const int = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : Number.NaN);

/** Mirrors the table's check constraints, so a refusal is explained before saving. */
function validate(f: FormState): TranslationKey | null {
  if (!f.name.trim()) return "promo_error_name";
  if (
    f.type === "buy_x_get_y" &&
    !(int(f.buy_qty) >= 1 && int(f.buy_qty) <= 20 && int(f.get_qty) >= 1 && int(f.get_qty) <= 20)
  )
    return "promo_error_qty";
  if (f.type === "buy_x_percent" && !(int(f.buy_qty) >= 1 && int(f.buy_qty) <= 20))
    return "promo_error_qty";
  if (
    (f.type === "buy_x_percent" || f.type === "category_percent") &&
    !(Number(f.percent) > 0 && Number(f.percent) < 100)
  )
    return "promo_error_percent";
  if (f.type === "pack") {
    const items = f.pack_items.filter((i) => i.product_id);
    if (items.length === 0) return "promo_error_pack_items";
    if (!(Number(f.pack_price) >= 0) || f.pack_price.trim() === "") return "promo_error_pack_price";
  }
  if (f.type !== "pack" && f.scope === "categories" && f.category_ids.length === 0)
    return "promo_error_scope";
  if (f.type !== "pack" && f.scope === "products" && f.product_ids.length === 0)
    return "promo_error_scope";
  if (f.starts_at && f.ends_at && new Date(f.ends_at) <= new Date(f.starts_at))
    return "promo_error_window";
  if (!/^-?\d{1,4}$/.test(f.priority.trim())) return "promo_error_priority";
  return null;
}

/** Only the current type's fields are sent — a stale percent must never keep pricing. */
function toInput(f: FormState): PromotionInput {
  const isPack = f.type === "pack";
  const pack = f.pack_items.filter((i) => i.product_id && i.quantity > 0);
  return {
    name: f.name.trim(),
    type: f.type,
    active: f.active,
    priority: Number(f.priority),
    starts_at: fromLocalInput(f.starts_at),
    ends_at: fromLocalInput(f.ends_at),
    scope: isPack ? "all" : f.scope,
    category_ids: !isPack && f.scope === "categories" ? f.category_ids : [],
    product_ids: !isPack && f.scope === "products" ? f.product_ids : [],
    buy_qty: f.type === "buy_x_get_y" || f.type === "buy_x_percent" ? int(f.buy_qty) : 0,
    get_qty: f.type === "buy_x_get_y" ? int(f.get_qty) : 0,
    percent: f.type === "buy_x_percent" || f.type === "category_percent" ? Number(f.percent) : 0,
    pack_items: isPack ? pack : [],
    pack_price: isPack ? Number(f.pack_price) : null,
    label_fr: f.label_fr.trim() || null,
    label_ar: f.label_ar.trim() || null,
  };
}

type LiveState = "live" | "scheduled" | "expired" | "paused";
function liveState(p: Promotion, now = new Date()): LiveState {
  if (!p.active) return "paused";
  if (p.starts_at && new Date(p.starts_at) > now) return "scheduled";
  if (p.ends_at && new Date(p.ends_at) <= now) return "expired";
  return "live";
}
const STATE_STYLE: Record<LiveState, string> = {
  live: "bg-accent/10 text-accent border-accent/30",
  scheduled: "bg-sky-400/10 text-sky-400 border-sky-400/30",
  expired: "bg-panel-2 text-muted border-line",
  paused: "bg-amber-400/10 text-amber-500 border-amber-400/30",
};
const STATE_KEY: Record<LiveState, TranslationKey> = {
  live: "promo_state_live",
  scheduled: "promo_state_scheduled",
  expired: "promo_state_expired",
  paused: "promo_state_paused",
};

function CheckList({
  items,
  selected,
  onChange,
}: {
  items: { id: string; label: string; sub?: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const shown = items.filter((i) => i.label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="rounded-xl border border-line">
      {items.length > 6 && (
        <div className="relative border-b border-line">
          <Search
            size={15}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("promo_search")}
            className="w-full bg-transparent py-2.5 ps-9 pe-3 text-sm text-ink outline-none placeholder:text-muted"
          />
        </div>
      )}
      <ul className="max-h-56 overflow-y-auto p-1">
        {shown.map((i) => {
          const on = selected.includes(i.id);
          return (
            <li key={i.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm hover:bg-panel-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    onChange(on ? selected.filter((x) => x !== i.id) : [...selected, i.id])
                  }
                  className="h-4 w-4 accent-[rgb(var(--c-brand))]"
                />
                <span className="min-w-0 flex-1 truncate text-ink">{i.label}</span>
                {i.sub && <span className="shrink-0 text-xs text-muted">{i.sub}</span>}
              </label>
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-3 py-3 text-sm text-muted">—</li>}
      </ul>
    </div>
  );
}

function PromotionForm({
  editing,
  onDone,
}: {
  editing: Promotion | null;
  onDone: (saved: boolean) => void;
}) {
  const { t, lang } = useLanguage();
  const save = useSavePromotion();
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useProducts({ includeAll: true });
  const [form, setForm] = useState<FormState>(() => toForm(editing));
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState<TranslationKey | null>(null);
  const error = validate(form);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setServerError(null);
    setForm((f) => ({ ...f, [k]: v }));
  };

  // Switching type clears the other types' fields.
  function pickType(type: PromotionType) {
    setServerError(null);
    setForm((f) => ({
      ...f,
      type,
      buy_qty: type === "buy_x_get_y" || type === "buy_x_percent" ? f.buy_qty : "",
      get_qty: type === "buy_x_get_y" ? f.get_qty : "",
      percent: type === "buy_x_percent" || type === "category_percent" ? f.percent : "",
      pack_items: type === "pack" ? f.pack_items : [{ product_id: "", quantity: 1 }],
      pack_price: type === "pack" ? f.pack_price : "",
    }));
  }

  const packGross = form.pack_items.reduce((s, it) => {
    const p = products.find((x) => x.id === it.product_id);
    return s + (p ? Number(p.price) * it.quantity : 0);
  }, 0);

  const input = toInput(form);
  const preview = promotionLabel(
    { ...input, label_fr: form.label_fr || null, label_ar: form.label_ar || null },
    lang,
    formatPrice
  );
  const generated = (l: "fr" | "ar") =>
    promotionLabel({ ...input, label_fr: null, label_ar: null }, l, formatPrice).replace(
      /[⁦-⁩]/g,
      ""
    );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (error) return;
    try {
      await save.mutateAsync({ id: editing?.id ?? null, input });
      onDone(true);
    } catch (err) {
      const code = readDbError(err).code;
      setServerError(
        code === "42P01" || code === "PGRST205" ? "settings_missing_migration" : "admin_save_error"
      );
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-ink">
          {editing ? t("promo_edit") : t("promo_new")}
        </h2>
        <button
          type="button"
          onClick={() => onDone(false)}
          className="rounded-full p-1.5 text-muted hover:bg-panel-2 hover:text-ink"
          aria-label={t("admin_cancel")}
        >
          <X size={18} />
        </button>
      </div>

      <FormSection title={t("promo_section_type")}>
        <Field label={t("promo_name")} hint={t("promo_name_hint")}>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={80} />
        </Field>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TYPES.map((tp) => {
            const on = form.type === tp.type;
            return (
              <button
                key={tp.type}
                type="button"
                aria-pressed={on}
                onClick={() => pickType(tp.type)}
                className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 text-start transition-colors",
                  on
                    ? "border-brand bg-brand/5 ring-1 ring-brand/40"
                    : "border-line hover:border-brand/40"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 rounded-lg p-2",
                    on ? "bg-brand text-white" : "bg-panel-2 text-muted"
                  )}
                >
                  <tp.icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">{t(tp.title)}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                    {t(tp.text)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection title={t("promo_section_rule")}>
        {form.type !== "pack" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(form.type === "buy_x_get_y" || form.type === "buy_x_percent") && (
              <Field label={t(form.type === "buy_x_get_y" ? "promo_buy" : "promo_min_qty")}>
                <Input
                  inputMode="numeric"
                  value={form.buy_qty}
                  onChange={(e) => set("buy_qty", e.target.value)}
                  placeholder="2"
                />
              </Field>
            )}
            {form.type === "buy_x_get_y" && (
              <Field label={t("promo_get")}>
                <Input
                  inputMode="numeric"
                  value={form.get_qty}
                  onChange={(e) => set("get_qty", e.target.value)}
                  placeholder="1"
                />
              </Field>
            )}
            {(form.type === "buy_x_percent" || form.type === "category_percent") && (
              <Field label={t("promo_percent")}>
                <Input
                  inputMode="decimal"
                  value={form.percent}
                  onChange={(e) => set("percent", e.target.value)}
                  placeholder="15"
                />
              </Field>
            )}
          </div>
        )}

        {form.type === "pack" && (
          <div className="space-y-3">
            {form.pack_items.map((it, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field label={`${t("promo_pack_product")} ${i + 1}`} className="min-w-0 flex-1">
                  <Select
                    value={it.product_id}
                    onChange={(e) =>
                      set(
                        "pack_items",
                        form.pack_items.map((x, j) =>
                          j === i ? { ...x, product_id: e.target.value } : x
                        )
                      )
                    }
                  >
                    <option value="">—</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {(lang === "ar" ? p.name_ar : p.name_fr) +
                          (p.status === "draft" ? ` (${t("promo_draft")})` : "")}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("promo_qty")} className="w-20 shrink-0">
                  <Input
                    inputMode="numeric"
                    value={String(it.quantity)}
                    onChange={(e) => {
                      const q = Math.max(
                        1,
                        Math.min(10, Number(e.target.value.replace(/\D/g, "")) || 1)
                      );
                      set(
                        "pack_items",
                        form.pack_items.map((x, j) => (j === i ? { ...x, quantity: q } : x))
                      );
                    }}
                  />
                </Field>
                <button
                  type="button"
                  disabled={form.pack_items.length === 1}
                  onClick={() =>
                    set(
                      "pack_items",
                      form.pack_items.filter((_, j) => j !== i)
                    )
                  }
                  className="mb-1 rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
                  aria-label={t("admin_delete")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            {form.pack_items.length < 6 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  set("pack_items", [...form.pack_items, { product_id: "", quantity: 1 }])
                }
              >
                <Plus size={15} />
                {t("promo_pack_add")}
              </Button>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("promo_pack_price")}>
                <Input
                  inputMode="numeric"
                  value={form.pack_price}
                  onChange={(e) => set("pack_price", e.target.value)}
                  placeholder="6000"
                />
              </Field>
              <div className="rounded-xl bg-panel-2 p-3 text-xs text-muted">
                <p>
                  {t("promo_pack_normal")}{" "}
                  <Price value={packGross} className="font-semibold text-ink" />
                </p>
                {Number(form.pack_price) >= 0 &&
                  form.pack_price !== "" &&
                  packGross > Number(form.pack_price) && (
                    <p className="mt-1 font-semibold text-accent">
                      {t("promo_pack_saving")} <Price value={packGross - Number(form.pack_price)} />
                    </p>
                  )}
              </div>
            </div>
          </div>
        )}

        {form.type !== "pack" && (
          <div className="space-y-3">
            <Field label={t("promo_scope")}>
              <Select
                value={form.scope}
                onChange={(e) => set("scope", e.target.value as PromotionScope)}
              >
                <option value="all">{t("promo_scope_all")}</option>
                <option value="categories">{t("promo_scope_categories")}</option>
                <option value="products">{t("promo_scope_products")}</option>
              </Select>
            </Field>
            {form.scope === "categories" && (
              <CheckList
                items={categories.map((c) => ({
                  id: c.id,
                  label: lang === "ar" ? c.name_ar : c.name_fr,
                }))}
                selected={form.category_ids}
                onChange={(ids) => set("category_ids", ids)}
              />
            )}
            {form.scope === "products" && (
              <CheckList
                items={products.map((p) => ({
                  id: p.id,
                  label: lang === "ar" ? p.name_ar : p.name_fr,
                  sub: p.status === "draft" ? t("promo_draft") : formatPrice(Number(p.price)),
                }))}
                selected={form.product_ids}
                onChange={(ids) => set("product_ids", ids)}
              />
            )}
          </div>
        )}
        <p className="rounded-xl bg-panel-2 px-3 py-2 text-xs leading-relaxed text-muted">
          {t("promo_no_stack")}
        </p>
      </FormSection>

      <FormSection title={t("promo_section_when")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("promo_starts")} hint={t("promo_starts_hint")}>
            <Input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => set("starts_at", e.target.value)}
            />
          </Field>
          <Field label={t("promo_ends")} hint={t("promo_ends_hint")}>
            <Input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => set("ends_at", e.target.value)}
            />
          </Field>
          <Field label={t("promo_priority")} hint={t("promo_priority_hint")}>
            <Input
              inputMode="numeric"
              value={form.priority}
              onChange={(e) => set("priority", e.target.value)}
            />
          </Field>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 sm:mt-6 sm:self-start">
            <span className="text-sm font-semibold text-ink">{t("promo_active")}</span>
            <Toggle
              checked={form.active}
              onChange={() => set("active", !form.active)}
              aria-label={t("promo_active")}
            />
          </div>
        </div>
      </FormSection>

      <FormSection title={t("promo_section_label")} description={t("promo_label_hint")}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={`${t("promo_label")} (FR)`}>
            <Input
              value={form.label_fr}
              onChange={(e) => set("label_fr", e.target.value)}
              maxLength={60}
              placeholder={generated("fr")}
            />
          </Field>
          <Field label={`${t("promo_label")} (AR)`}>
            <Input
              dir="rtl"
              value={form.label_ar}
              onChange={(e) => set("label_ar", e.target.value)}
              maxLength={60}
              placeholder={generated("ar")}
            />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          {t("promo_preview")}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
            <Gift size={12} />
            {preview}
          </span>
        </div>
      </FormSection>

      {(showErrors && error) || serverError ? (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {t((serverError ?? error) as TranslationKey)}
        </p>
      ) : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => onDone(false)}>
          {t("admin_cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "…" : t("admin_save")}
        </Button>
      </div>
    </form>
  );
}

export default function AdminPromotions() {
  const { t, lang } = useLanguage();
  const { data: promos = [], isLoading, isError, error } = useAllPromotionsAdmin();
  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useProducts({ includeAll: true });
  const toggle = useTogglePromotion();
  const del = useDeletePromotion();
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [toDelete, setToDelete] = useState<Promotion | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const missingTable = isError && ["42P01", "PGRST205"].includes(readDbError(error).code);

  const scopeText = useMemo(
    () => (p: Promotion) => {
      if (p.type === "pack") {
        return p.pack_items
          .map((it) => {
            const pr = products.find((x) => x.id === it.product_id);
            return `${it.quantity} × ${pr ? (lang === "ar" ? pr.name_ar : pr.name_fr) : "?"}`;
          })
          .join(" + ");
      }
      if (p.scope === "all") return t("promo_scope_all");
      if (p.scope === "categories")
        return p.category_ids
          .map((id) => {
            const c = categories.find((x) => x.id === id);
            return c ? (lang === "ar" ? c.name_ar : c.name_fr) : "?";
          })
          .join(", ");
      return `${p.product_ids.length} ${t("promo_products_count")}`;
    },
    [products, categories, lang, t]
  );

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(lang === "ar" ? "ar-DZ" : "fr-DZ", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  function open(p: Promotion | null) {
    setEditing(p);
    setFormKey((k) => k + 1);
    setFormOpen(true);
    setNotice(null);
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">{t("promo_title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t("promo_intro")}</p>
        </div>
        {!formOpen && !missingTable && (
          <Button size="sm" onClick={() => open(null)} className="self-start">
            <Plus size={16} />
            {t("promo_new")}
          </Button>
        )}
      </div>

      {missingTable && (
        <p className="mb-4 rounded-xl bg-amber-400/10 px-3 py-2 text-sm text-amber-500">
          {t("settings_missing_migration")}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-4 rounded-xl bg-accent/10 px-3 py-2 text-sm text-accent">
          {t(notice)}
        </p>
      )}

      {formOpen && (
        <PromotionForm
          key={formKey}
          editing={editing}
          onDone={(saved) => {
            setFormOpen(false);
            if (saved) setNotice("promo_saved");
          }}
        />
      )}

      {isLoading && <p className="text-muted">{t("loading")}</p>}
      {!isLoading && !isError && promos.length === 0 && !formOpen && (
        <BentoPanel className="p-8 text-center text-sm text-muted">{t("promo_empty")}</BentoPanel>
      )}

      <ul className="space-y-3">
        {promos.map((p) => {
          const state = liveState(p);
          return (
            <li key={p.id}>
              <BentoPanel className="p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-ink">{p.name}</p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-bold",
                          STATE_STYLE[state]
                        )}
                      >
                        {t(STATE_KEY[state])}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {t(TYPES.find((x) => x.type === p.type)?.title ?? "promo_type_pct")} ·{" "}
                      {scopeText(p)}
                    </p>
                    {(p.starts_at || p.ends_at) && (
                      <p className="mt-1 text-xs text-muted">
                        {p.starts_at ? fmtDate(p.starts_at) : "…"} →{" "}
                        {p.ends_at ? fmtDate(p.ends_at) : "…"}
                      </p>
                    )}
                    <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                      <Gift size={12} className="shrink-0" />
                      <span className="truncate">{promotionLabel(p, lang, formatPrice)}</span>
                    </span>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <Toggle
                      checked={p.active}
                      disabled={toggle.isPending}
                      onChange={() => toggle.mutate({ id: p.id, active: !p.active })}
                      aria-label={`${t("promo_active")} — ${p.name}`}
                    />
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => open(p)}
                        className="rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-brand"
                        aria-label={`${t("promo_edit")} ${p.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          del.reset();
                          setToDelete(p);
                        }}
                        className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-500"
                        aria-label={`${t("admin_delete")} ${p.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </BentoPanel>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={toDelete !== null}
        title={`${t("promo_delete_title")} « ${toDelete?.name ?? ""} »`}
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
        <p>{t("promo_delete_body")}</p>
      </ConfirmDialog>
    </div>
  );
}
