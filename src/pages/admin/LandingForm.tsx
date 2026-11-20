import { type FormEvent, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  ImageOff,
  ImagePlus,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { useLandingAdmin, useSaveLanding } from "@/hooks/useLandings";
import { useProducts } from "@/hooks/useProducts";
import {
  type LandingBenefit,
  type LandingFaq,
  type LandingSection,
  type LandingSectionKey,
  type ProductLanding,
  type ProductLandingInput,
  mergeSections,
} from "@/lib/landing";
import { deleteAdminImage, uploadAdminImage } from "@/lib/image";
import { readDbError } from "@/lib/dbError";
import { slugify } from "@/lib/utils";
import { Field, FormSection } from "@/components/admin/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SmartImage } from "@/components/ui/SmartImage";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const SECTION_LABEL: Record<LandingSectionKey, TranslationKey> = {
  countdown: "lp_sec_countdown",
  gallery: "lp_sec_gallery",
  benefits: "lp_sec_benefits",
  story: "lp_sec_story",
  specs: "lp_sec_specs",
  offers: "lp_sec_offers",
  order: "lp_sec_order",
  reviews: "lp_sec_reviews",
  faq: "lp_sec_faq",
};

type TextKey =
  | "headline_fr"
  | "headline_ar"
  | "sub_fr"
  | "sub_ar"
  | "cta_fr"
  | "cta_ar"
  | "urgency_fr"
  | "urgency_ar"
  | "story_title_fr"
  | "story_title_ar"
  | "story_fr"
  | "story_ar";

interface FormState extends Record<TextKey, string> {
  slug: string;
  product_id: string;
  published: boolean;
  hero_image_url: string | null;
  story_image_url: string | null;
  countdown_hours: string;
  benefits: LandingBenefit[];
  faq: LandingFaq[];
  sections: LandingSection[];
}

function toForm(l: ProductLanding | null): FormState {
  const s = (v: string | null | undefined) => v ?? "";
  return {
    slug: l?.slug ?? "",
    product_id: l?.product_id ?? "",
    published: l?.status === "published",
    headline_fr: s(l?.headline_fr),
    headline_ar: s(l?.headline_ar),
    sub_fr: s(l?.sub_fr),
    sub_ar: s(l?.sub_ar),
    cta_fr: s(l?.cta_fr),
    cta_ar: s(l?.cta_ar),
    urgency_fr: s(l?.urgency_fr),
    urgency_ar: s(l?.urgency_ar),
    story_title_fr: s(l?.story_title_fr),
    story_title_ar: s(l?.story_title_ar),
    story_fr: s(l?.story_fr),
    story_ar: s(l?.story_ar),
    hero_image_url: l?.hero_image_url ?? null,
    story_image_url: l?.story_image_url ?? null,
    countdown_hours: l?.countdown_hours ? String(l.countdown_hours) : "",
    benefits: l?.benefits ?? [],
    faq: l?.faq ?? [],
    sections: l?.sections ?? mergeSections([]),
  };
}

const LIMITS: Record<TextKey, number> = {
  headline_fr: 120,
  headline_ar: 120,
  sub_fr: 300,
  sub_ar: 300,
  cta_fr: 40,
  cta_ar: 40,
  urgency_fr: 120,
  urgency_ar: 120,
  story_title_fr: 120,
  story_title_ar: 120,
  story_fr: 2000,
  story_ar: 2000,
};

function ImagePicker({
  label,
  hint,
  url,
  fallback,
  onChange,
  onUploaded,
}: {
  label: string;
  hint: string;
  url: string | null;
  fallback: string | null;
  onChange: (url: string | null) => void;
  onUploaded: (url: string) => void;
}) {
  const { t } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const shown = url ?? fallback;
  return (
    <div>
      <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-line bg-panel-2">
        {shown ? (
          <SmartImage src={shown} alt="" sizes="320px" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            <ImageOff size={22} />
          </div>
        )}
        {!url && shown && (
          <span className="absolute start-2 top-2 rounded-full bg-bg/85 px-2 py-0.5 text-[11px] font-semibold text-muted">
            {t("lp_image_default")}
          </span>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/70 text-xs font-semibold text-ink">
            {t("category_uploading")}
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="flex-1"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <ImagePlus size={15} />
          {url ? t("category_replace_image") : t("category_add_image")}
        </Button>
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            aria-label={t("category_remove_image")}
          >
            <Trash2 size={15} />
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">{error ? t("category_error_upload") : hint}</p>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        tabIndex={-1}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setError(false);
          try {
            const u = await uploadAdminImage(file, "landings");
            onUploaded(u);
            onChange(u);
          } catch {
            setError(true);
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

function Editor({ initial }: { initial: ProductLanding | null }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const save = useSaveLanding();
  const { data: products = [] } = useProducts({ includeAll: true });
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [showErrors, setShowErrors] = useState(false);
  // A brand-new page remounts on its own URL after the first save; the
  // confirmation travels in the navigation state so it is not lost.
  const location = useLocation();
  const [status, setStatus] = useState<{ ok: boolean; key: TranslationKey } | null>(() => {
    const saved = (location.state as { saved?: TranslationKey } | null)?.saved;
    return saved ? { ok: true, key: saved } : null;
  });
  const uploaded = useRef<string[]>([]);

  const product = products.find((p) => p.id === form.product_id);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setStatus(null);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const text = (k: TextKey) => ({
    value: form[k],
    maxLength: LIMITS[k],
    dir: k.endsWith("_ar") ? ("rtl" as const) : ("ltr" as const),
    onChange: (e: { target: { value: string } }) => set(k, e.target.value),
  });

  const errors: TranslationKey[] = [];
  if (!form.product_id) errors.push("lp_error_product");
  if (!SLUG_RE.test(form.slug) || form.slug.length > 80) errors.push("lp_error_slug");
  if (
    form.countdown_hours &&
    !(Number(form.countdown_hours) >= 1 && Number(form.countdown_hours) <= 168)
  )
    errors.push("lp_error_countdown");

  function pickProduct(id: string) {
    const p = products.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      product_id: id,
      slug: slugTouched || !p ? f.slug : slugify(p.slug || p.name_fr),
    }));
    setStatus(null);
  }

  function moveSection(i: number, d: number) {
    const next = [...form.sections];
    const [s] = next.splice(i, 1);
    next.splice(i + d, 0, s);
    set("sections", next);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (errors.length) return;
    const n = (v: string) => (v.trim() === "" ? null : v.trim());
    const input: ProductLandingInput = {
      slug: form.slug,
      product_id: form.product_id,
      status: form.published ? "published" : "draft",
      headline_fr: n(form.headline_fr),
      headline_ar: n(form.headline_ar),
      sub_fr: n(form.sub_fr),
      sub_ar: n(form.sub_ar),
      cta_fr: n(form.cta_fr),
      cta_ar: n(form.cta_ar),
      urgency_fr: n(form.urgency_fr),
      urgency_ar: n(form.urgency_ar),
      story_title_fr: n(form.story_title_fr),
      story_title_ar: n(form.story_title_ar),
      story_fr: n(form.story_fr),
      story_ar: n(form.story_ar),
      hero_image_url: form.hero_image_url,
      story_image_url: form.story_image_url,
      countdown_hours: form.countdown_hours ? Number(form.countdown_hours) : null,
      benefits: form.benefits.filter((b) => b.title_fr.trim() || b.title_ar.trim()),
      faq: form.faq.filter((f) => f.q_fr.trim() || f.q_ar.trim()),
      sections: form.sections,
    };
    try {
      const id = await save.mutateAsync({ id: initial?.id ?? null, input });
      // Photos replaced during this edit, and the previous ones, are cleaned up.
      const keep = new Set([form.hero_image_url, form.story_image_url]);
      const stale = [
        ...uploaded.current,
        initial?.hero_image_url ?? null,
        initial?.story_image_url ?? null,
      ].filter((u): u is string => !!u && !keep.has(u));
      for (const u of stale) void deleteAdminImage(u);
      uploaded.current = [];
      const key: TranslationKey = form.published ? "lp_saved_published" : "lp_saved_draft";
      setStatus({ ok: true, key });
      if (!initial) navigate(`/admin/landings/${id}`, { replace: true, state: { saved: key } });
    } catch (err) {
      const code = readDbError(err).code;
      setStatus({
        ok: false,
        key:
          code === "23505"
            ? "lp_error_slug_taken"
            : code === "23514"
              ? "lp_error_invalid"
              : "admin_save_error",
      });
    }
  }

  const listEditor = <T extends LandingBenefit | LandingFaq>(
    key: "benefits" | "faq",
    items: T[],
    fields: { k: keyof T & string; label: TranslationKey; area?: boolean }[],
    empty: T,
    max: number
  ) => (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-xs text-brand">{String(i + 1).padStart(2, "0")}</span>
            <button
              type="button"
              onClick={() => set(key, items.filter((_, j) => j !== i) as FormState[typeof key])}
              className="rounded-lg p-1.5 text-muted hover:bg-red-500/10 hover:text-red-500"
              aria-label={t("admin_delete")}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {fields.map((f) => {
              const value = String(item[f.k] ?? "");
              const ar = f.k.endsWith("_ar");
              const onChange = (e: { target: { value: string } }) =>
                set(
                  key,
                  items.map((x, j) =>
                    j === i ? { ...x, [f.k]: e.target.value } : x
                  ) as FormState[typeof key]
                );
              return (
                <Field key={f.k} label={`${t(f.label)} (${ar ? "AR" : "FR"})`}>
                  {f.area ? (
                    <Textarea
                      rows={2}
                      dir={ar ? "rtl" : "ltr"}
                      value={value}
                      maxLength={400}
                      onChange={onChange}
                    />
                  ) : (
                    <Input
                      dir={ar ? "rtl" : "ltr"}
                      value={value}
                      maxLength={120}
                      onChange={onChange}
                    />
                  )}
                </Field>
              );
            })}
          </div>
        </div>
      ))}
      {items.length < max && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => set(key, [...items, empty] as FormState[typeof key])}
        >
          <Plus size={15} />
          {t("lp_add_item")}
        </Button>
      )}
    </div>
  );

  const productName = product ? (lang === "ar" ? product.name_ar : product.name_fr) : "";

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 pb-24">
      <FormSection title={t("lp_section_product")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("lp_product")}>
            <Select value={form.product_id} onChange={(e) => pickProduct(e.target.value)}>
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {(lang === "ar" ? p.name_ar : p.name_fr) +
                    (p.status === "draft" ? ` (${t("promo_draft")})` : "")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("lp_slug")} hint={`www.auto-market.shop/lp/${form.slug || "…"}`}>
            <Input
              dir="ltr"
              value={form.slug}
              maxLength={80}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
              }}
              error={
                showErrors && errors.includes("lp_error_slug") ? t("lp_error_slug") : undefined
              }
            />
          </Field>
        </div>
        {product && product.status !== "active" && (
          <p className="rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-500">
            {t("lp_product_inactive_hint")}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
          <div>
            <p className="text-sm font-semibold text-ink">{t("lp_published")}</p>
            <p className="text-xs text-muted">{t("lp_published_hint")}</p>
          </div>
          <Toggle
            checked={form.published}
            onChange={() => set("published", !form.published)}
            aria-label={t("lp_published")}
          />
        </div>
      </FormSection>

      <FormSection title={t("lp_section_hero")} description={t("lp_copy_hint")}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_16rem]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`${t("lp_headline")} (FR)`}>
              <Input {...text("headline_fr")} placeholder={product?.name_fr ?? ""} />
            </Field>
            <Field label={`${t("lp_headline")} (AR)`}>
              <Input {...text("headline_ar")} placeholder={product?.name_ar ?? ""} />
            </Field>
            <Field label={`${t("lp_sub")} (FR)`}>
              <Textarea
                rows={3}
                {...text("sub_fr")}
                placeholder={(product?.description_fr ?? "").slice(0, 120)}
              />
            </Field>
            <Field label={`${t("lp_sub")} (AR)`}>
              <Textarea
                rows={3}
                {...text("sub_ar")}
                placeholder={(product?.description_ar ?? "").slice(0, 120)}
              />
            </Field>
            <Field label={`${t("lp_cta")} (FR)`}>
              <Input {...text("cta_fr")} placeholder={"Commander maintenant"} />
            </Field>
            <Field label={`${t("lp_cta")} (AR)`}>
              <Input {...text("cta_ar")} placeholder={"اطلب الآن"} />
            </Field>
          </div>
          <ImagePicker
            label={t("lp_hero_image")}
            hint={t("lp_hero_image_hint")}
            url={form.hero_image_url}
            fallback={product?.product_images?.[0]?.url ?? null}
            onChange={(u) => set("hero_image_url", u)}
            onUploaded={(u) => uploaded.current.push(u)}
          />
        </div>
      </FormSection>

      <FormSection title={t("lp_section_urgency")} description={t("lp_urgency_hint")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t("lp_countdown")} hint={t("lp_countdown_hint")}>
            <Input
              inputMode="numeric"
              value={form.countdown_hours}
              onChange={(e) => set("countdown_hours", e.target.value.replace(/\D/g, ""))}
              placeholder="24"
              error={
                showErrors && errors.includes("lp_error_countdown")
                  ? t("lp_error_countdown")
                  : undefined
              }
            />
          </Field>
          <Field label={`${t("lp_urgency")} (FR)`}>
            <Input {...text("urgency_fr")} placeholder="Offre limitée — se termine dans" />
          </Field>
          <Field label={`${t("lp_urgency")} (AR)`}>
            <Input {...text("urgency_ar")} placeholder="عرض محدود — ينتهي خلال" />
          </Field>
        </div>
      </FormSection>

      <FormSection title={t("lp_section_story")}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_16rem]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`${t("lp_story_title")} (FR)`}>
              <Input {...text("story_title_fr")} placeholder={productName} />
            </Field>
            <Field label={`${t("lp_story_title")} (AR)`}>
              <Input {...text("story_title_ar")} />
            </Field>
            <Field label={`${t("lp_story")} (FR)`}>
              <Textarea rows={6} {...text("story_fr")} />
            </Field>
            <Field label={`${t("lp_story")} (AR)`}>
              <Textarea rows={6} {...text("story_ar")} />
            </Field>
          </div>
          <ImagePicker
            label={t("lp_story_image")}
            hint={t("lp_story_image_hint")}
            url={form.story_image_url}
            fallback={product?.product_images?.[1]?.url ?? null}
            onChange={(u) => set("story_image_url", u)}
            onUploaded={(u) => uploaded.current.push(u)}
          />
        </div>
      </FormSection>

      <FormSection title={t("lp_section_benefits")} description={t("lp_benefits_hint")}>
        {listEditor<LandingBenefit>(
          "benefits",
          form.benefits,
          [
            { k: "title_fr", label: "lp_item_title" },
            { k: "title_ar", label: "lp_item_title" },
            { k: "text_fr", label: "lp_item_text", area: true },
            { k: "text_ar", label: "lp_item_text", area: true },
          ],
          { title_fr: "", title_ar: "", text_fr: "", text_ar: "" },
          8
        )}
      </FormSection>

      <FormSection title={t("lp_section_faq")} description={t("lp_faq_hint")}>
        {listEditor<LandingFaq>(
          "faq",
          form.faq,
          [
            { k: "q_fr", label: "lp_item_question" },
            { k: "q_ar", label: "lp_item_question" },
            { k: "a_fr", label: "lp_item_answer", area: true },
            { k: "a_ar", label: "lp_item_answer", area: true },
          ],
          { q_fr: "", q_ar: "", a_fr: "", a_ar: "" },
          12
        )}
      </FormSection>

      <FormSection title={t("lp_section_layout")} description={t("lp_layout_hint")}>
        <ol className="space-y-2">
          {form.sections.map((s, i) => (
            <li
              key={s.key}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${s.visible ? "border-line" : "border-dashed border-line opacity-60"}`}
            >
              <span className="font-mono text-xs text-brand">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                {t(SECTION_LABEL[s.key])}
              </span>
              <button
                type="button"
                disabled={i === 0}
                onClick={() => moveSection(i, -1)}
                className="rounded-lg p-1.5 text-muted hover:bg-panel-2 disabled:opacity-30"
                aria-label={t("legal_move_up")}
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                disabled={i === form.sections.length - 1}
                onClick={() => moveSection(i, 1)}
                className="rounded-lg p-1.5 text-muted hover:bg-panel-2 disabled:opacity-30"
                aria-label={t("legal_move_down")}
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                onClick={() =>
                  set(
                    "sections",
                    form.sections.map((x, j) => (j === i ? { ...x, visible: !x.visible } : x))
                  )
                }
                className="rounded-lg p-1.5 text-muted hover:bg-panel-2"
                aria-pressed={!s.visible}
                aria-label={s.visible ? t("legal_hide") : t("legal_show")}
              >
                {s.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
            </li>
          ))}
        </ol>
        {form.sections.some((s) => s.key === "order" && !s.visible) && (
          <p className="text-xs text-amber-500">{t("lp_order_hidden")}</p>
        )}
      </FormSection>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:px-6 lg:-mx-8 lg:px-8">
        {status && (
          <p
            role="status"
            className={status.ok ? "text-sm font-semibold text-accent" : "text-sm text-red-500"}
          >
            {t(status.key)}
          </p>
        )}
        {showErrors && errors.length > 0 && !status && (
          <p className="text-sm text-red-500">{t(errors[0])}</p>
        )}
        {initial && (
          <a
            href={`/lp/${initial.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink"
          >
            <ExternalLink size={15} />
            {t("lp_preview")}
          </a>
        )}
        <Button type="submit" disabled={save.isPending} className="sm:min-w-40">
          <Save size={16} />
          {save.isPending ? "…" : t("admin_save")}
        </Button>
      </div>
    </form>
  );
}

export default function AdminLandingForm() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { data, isLoading, isError } = useLandingAdmin(id);

  return (
    <div className="max-w-5xl">
      <Link
        to="/admin/landings"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand"
      >
        <ArrowLeft size={15} className="rtl:rotate-180" />
        {t("lp_admin_title")}
      </Link>
      <h1 className="mb-6 font-heading text-2xl font-extrabold text-ink">
        {id ? t("lp_admin_edit") : t("lp_admin_new")}
      </h1>
      {id && isLoading && <p className="text-muted">{t("loading")}</p>}
      {id && (isError || (!isLoading && !data)) && (
        <p className="text-red-500">{t("admin_load_error")}</p>
      )}
      {(!id || data) && <Editor key={data?.id ?? "new"} initial={data ?? null} />}
    </div>
  );
}
