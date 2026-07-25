import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Film, Plus, Trash2, Upload, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image";
import { sanitizeOffers } from "@/lib/offers";
import { normalizeColors } from "@/lib/colors";
import { slugify } from "@/lib/utils";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { ProductColor, ProductImage, ProductVariantGroup, QuantityOffer } from "@/types/db";
import type { TranslationKey } from "@/i18n/translations";

interface FormState {
  name_fr: string;
  name_ar: string;
  description_fr: string;
  description_ar: string;
  details_fr: string;
  details_ar: string;
  price: string;
  compare_at_price: string;
  category_id: string;
  stock: string;
  featured: boolean;
  status: "active" | "draft";
}

const EMPTY_FORM: FormState = {
  name_fr: "",
  name_ar: "",
  description_fr: "",
  description_ar: "",
  details_fr: "",
  details_ar: "",
  price: "",
  compare_at_price: "",
  category_id: "",
  stock: "0",
  featured: false,
  status: "draft",
};

/* Every control gets a visible label — placeholder-only forms are unusable
   once more than a couple of fields are on screen. */
function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-ink">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-heading text-base font-bold text-ink">{children}</h2>;
}

/**
 * `slug` is unique. Two products with the same name — or any name that slugifies
 * to nothing, like an Arabic-only title — collided on insert and surfaced as a
 * generic "save failed". Suffix until it's free.
 */
async function uniqueSlug(nameFr: string): Promise<string> {
  const base = slugify(nameFr) || "produit";
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}

function ChipListEditor({
  labelKey,
  placeholderKey,
  values,
  onChange,
}: {
  labelKey: TranslationKey;
  placeholderKey: TranslationKey;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setDraft("");
  }

  return (
    <Field label={t(labelKey)}>
      <div className="flex gap-2">
        <Input
          placeholder={t(placeholderKey)}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={add} className="shrink-0">
          <Plus size={15} />
          {t("admin_variant_add")}
        </Button>
      </div>
      {values.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="fx-pop inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-sm font-medium text-brand"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="rounded-full p-0.5 hover:bg-brand/20"
                aria-label={`Remove ${v}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

function VariantValueChips({
  values,
  onChange,
}: {
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v || values.includes(v)) return;
    onChange([...values, v]);
    setDraft("");
  }

  return (
    <div>
      <div className="flex gap-2">
        <Input
          placeholder={t("admin_variant_value_placeholder")}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" size="sm" onClick={add} className="shrink-0">
          <Plus size={15} />
          {t("admin_variant_add")}
        </Button>
      </div>
      {values.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="fx-pop inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-sm font-medium text-brand"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="rounded-full p-0.5 hover:bg-brand/20"
                aria-label={`Remove ${v}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ColorVariantsEditor({
  colors,
  onChange,
}: {
  colors: ProductColor[];
  onChange: (next: ProductColor[]) => void;
}) {
  const { t } = useLanguage();
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  function update(i: number, patch: Partial<ProductColor>) {
    onChange(colors.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function remove(i: number) {
    onChange(colors.filter((_, idx) => idx !== i));
  }

  async function handleImageUpload(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIndex(i);
    try {
      const optimized = await compressImage(file);
      const path = `colors/${crypto.randomUUID()}-${optimized.name}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, optimized, { cacheControl: "31536000", contentType: optimized.type });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      update(i, { image_url: data.publicUrl });
    } finally {
      setUploadingIndex(null);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {colors.length === 0 && <p className="text-sm text-muted">{t("admin_variant_color_none")}</p>}

      {colors.map((c, i) => (
        <div
          key={i}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-panel-2/50 p-3"
        >
          <div className="min-w-32 flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              {t("admin_variant_color_label_fr")}
            </label>
            <Input value={c.label_fr} onChange={(e) => update(i, { label_fr: e.target.value })} />
          </div>
          <div className="min-w-32 flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              {t("admin_variant_color_label_ar")}
            </label>
            <Input dir="rtl" value={c.label_ar} onChange={(e) => update(i, { label_ar: e.target.value })} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              {t("admin_variant_color_hex")}
            </label>
            <input
              type="color"
              value={c.hex}
              onChange={(e) => update(i, { hex: e.target.value })}
              className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-panel p-1"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              {t("admin_variant_color_image")}
            </label>
            {c.image_url ? (
              <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-line">
                <img src={c.image_url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => update(i, { image_url: null })}
                  className="absolute end-0 top-0 rounded-full bg-black/60 p-0.5 text-white"
                  aria-label={t("admin_remove")}
                >
                  <X size={10} />
                </button>
              </div>
            ) : (
              <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-dashed border-line text-muted hover:border-brand hover:text-brand">
                <Upload size={14} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingIndex === i}
                  onChange={(e) => handleImageUpload(i, e)}
                />
              </label>
            )}
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="mb-1 rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-red-500"
            aria-label={t("admin_confirm_delete")}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...colors, { label_fr: "", label_ar: "", hex: "#111111", image_url: null }])}
      >
        <Plus size={15} />
        {t("admin_variant_color_add")}
      </Button>
    </div>
  );
}

function CustomVariantsEditor({
  groups,
  onChange,
}: {
  groups: ProductVariantGroup[];
  onChange: (next: ProductVariantGroup[]) => void;
}) {
  const { t } = useLanguage();

  function updateGroup(i: number, patch: Partial<ProductVariantGroup>) {
    onChange(groups.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));
  }

  function removeGroup(i: number) {
    onChange(groups.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      {groups.length === 0 && <p className="text-sm text-muted">{t("admin_variant_group_none")}</p>}

      {groups.map((group, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-line bg-panel-2/50 p-3">
          <div className="flex items-start gap-2">
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={t("admin_variant_group_name_fr")}>
                <Input
                  value={group.name_fr}
                  onChange={(e) => updateGroup(i, { name_fr: e.target.value })}
                />
              </Field>
              <Field label={t("admin_variant_group_name_ar")}>
                <Input
                  dir="rtl"
                  value={group.name_ar}
                  onChange={(e) => updateGroup(i, { name_ar: e.target.value })}
                />
              </Field>
            </div>
            <button
              type="button"
              onClick={() => removeGroup(i)}
              className="mt-7 shrink-0 rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-red-500"
              aria-label={t("admin_confirm_delete")}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <Field label={t("admin_variant_group_values")}>
            <VariantValueChips
              values={group.values}
              onChange={(values) => updateGroup(i, { values })}
            />
          </Field>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...groups, { name_fr: "", name_ar: "", values: [] }])}
      >
        <Plus size={15} />
        {t("admin_variant_group_add")}
      </Button>
    </div>
  );
}

function OffersEditor({
  offers,
  onChange,
}: {
  offers: QuantityOffer[];
  onChange: (next: QuantityOffer[]) => void;
}) {
  const { t } = useLanguage();

  function update(index: number, offer: QuantityOffer) {
    onChange(offers.map((o, i) => (i === index ? offer : o)));
  }

  function setNumber(index: number, key: string, raw: string) {
    const value = Math.max(0, Number(raw) || 0);
    update(index, { ...offers[index], [key]: value } as QuantityOffer);
  }

  return (
    <div className="space-y-3">
      {offers.length === 0 && <p className="text-sm text-muted">{t("admin_offer_none")}</p>}

      {offers.map((offer, i) => (
        <div
          key={i}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-panel-2/50 p-3"
        >
          <div className="min-w-44 flex-1">
            <label className="mb-1.5 block text-xs font-semibold text-muted">
              {t("admin_product_offers")}
            </label>
            <Select
              value={offer.type}
              onChange={(e) =>
                update(
                  i,
                  e.target.value === "free"
                    ? { type: "free", buy: 2, get: 1 }
                    : { type: "price", qty: 2, price: 0 }
                )
              }
            >
              <option value="free">{t("admin_offer_type_free")}</option>
              <option value="price">{t("admin_offer_type_price")}</option>
            </Select>
          </div>

          {offer.type === "free" ? (
            <>
              <div className="w-24">
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  {t("admin_offer_buy")}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={offer.buy || ""}
                  onChange={(e) => setNumber(i, "buy", e.target.value)}
                />
              </div>
              <div className="w-24">
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  {t("admin_offer_get")}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={offer.get || ""}
                  onChange={(e) => setNumber(i, "get", e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div className="w-24">
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  {t("admin_offer_qty")}
                </label>
                <Input
                  type="number"
                  min={2}
                  value={offer.qty || ""}
                  onChange={(e) => setNumber(i, "qty", e.target.value)}
                />
              </div>
              <div className="w-32">
                <label className="mb-1.5 block text-xs font-semibold text-muted">
                  {t("admin_offer_price")}
                </label>
                <Input
                  type="number"
                  min={0}
                  value={offer.price || ""}
                  onChange={(e) => setNumber(i, "price", e.target.value)}
                />
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => onChange(offers.filter((_, x) => x !== i))}
            className="mb-1 rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-red-500"
            aria-label={t("admin_confirm_delete")}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...offers, { type: "free", buy: 2, get: 1 }])}
      >
        <Plus size={15} />
        {t("admin_offer_add")}
      </Button>
    </div>
  );
}

export default function AdminProductForm() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const { data: categories = [] } = useCategories();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [variantGroups, setVariantGroups] = useState<ProductVariantGroup[]>([]);
  const [offers, setOffers] = useState<QuantityOffer[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from("products")
      .select("*, product_images(*)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setForm({
          name_fr: data.name_fr,
          name_ar: data.name_ar,
          description_fr: data.description_fr ?? "",
          description_ar: data.description_ar ?? "",
          details_fr: (data.details_fr ?? []).join("\n"),
          details_ar: (data.details_ar ?? []).join("\n"),
          price: String(data.price),
          compare_at_price: data.compare_at_price ? String(data.compare_at_price) : "",
          category_id: data.category_id ?? "",
          stock: String(data.stock),
          featured: data.featured,
          status: data.status,
        });
        setColors(normalizeColors(data.colors));
        setSizes(data.sizes ?? []);
        setVariantGroups(data.variants ?? []);
        setOffers(sanitizeOffers(data.quantity_offers));
        setVideoUrl(data.video_url ?? null);
        setImages(data.product_images ?? []);
      });
  }, [id, isNew]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      // Resize/re-encode first: whatever lands in the bucket is exactly what
      // every shopper downloads, and the path is unique so it can cache forever.
      const optimized = await compressImage(file);
      const path = `products/${crypto.randomUUID()}-${optimized.name}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, optimized, { cacheControl: "31536000", contentType: optimized.type });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
      setImages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), product_id: id ?? "", url: publicUrl.publicUrl, alt: null, sort_order: prev.length },
      ]);
    } catch {
      setError(t("admin_save_error"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setError(null);
    try {
      const path = `products/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("product-videos")
        .upload(path, file, { cacheControl: "31536000", contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("product-videos").getPublicUrl(path);
      setVideoUrl(publicUrl.publicUrl);
    } catch {
      setError(t("admin_save_error"));
    } finally {
      setUploadingVideo(false);
      e.target.value = "";
    }
  }

  function removeImage(imageId: string) {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name_fr: form.name_fr,
        name_ar: form.name_ar,
        description_fr: form.description_fr || null,
        description_ar: form.description_ar || null,
        details_fr: form.details_fr.split("\n").map((s) => s.trim()).filter(Boolean),
        details_ar: form.details_ar.split("\n").map((s) => s.trim()).filter(Boolean),
        price: Number(form.price),
        compare_at_price: form.compare_at_price ? Number(form.compare_at_price) : null,
        category_id: form.category_id || null,
        stock: Number(form.stock),
        colors,
        sizes,
        variants: variantGroups.filter((g) => g.name_fr.trim() && g.values.length > 0),
        quantity_offers: sanitizeOffers(offers),
        video_url: videoUrl,
        featured: form.featured,
        status: form.status,
      };

      let productId = id;
      if (isNew) {
        const { data, error } = await supabase
          .from("products")
          .insert({ ...payload, slug: await uniqueSlug(form.name_fr) })
          .select()
          .single();
        if (error) throw error;
        productId = data.id;
      } else {
        const { error } = await supabase.from("products").update(payload).eq("id", id);
        if (error) throw error;
      }

      // Sync images: delete removed, insert new
      await supabase.from("product_images").delete().eq("product_id", productId);
      if (images.length > 0) {
        await supabase.from("product_images").insert(
          images.map((img, i) => ({
            product_id: productId,
            url: img.url,
            alt: img.alt,
            sort_order: i,
          }))
        );
      }

      navigate("/admin/products");
    } catch {
      setError(t("admin_save_error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 font-heading text-2xl font-extrabold text-ink">
        {isNew ? t("admin_add") : t("admin_edit")}
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <BentoPanel className="space-y-4 p-5">
            <SectionTitle>{t("admin_product_info")}</SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("admin_product_name_fr")}>
                <Input
                  value={form.name_fr}
                  onChange={(e) => setForm((f) => ({ ...f, name_fr: e.target.value }))}
                />
              </Field>
              <Field label={t("admin_product_name_ar")}>
                <Input
                  dir="rtl"
                  value={form.name_ar}
                  onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("admin_product_description_fr")}>
                <Textarea
                  rows={3}
                  value={form.description_fr}
                  onChange={(e) => setForm((f) => ({ ...f, description_fr: e.target.value }))}
                />
              </Field>
              <Field label={t("admin_product_description_ar")}>
                <Textarea
                  dir="rtl"
                  rows={3}
                  value={form.description_ar}
                  onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("admin_product_details_fr")}>
                <Textarea
                  rows={3}
                  value={form.details_fr}
                  onChange={(e) => setForm((f) => ({ ...f, details_fr: e.target.value }))}
                />
              </Field>
              <Field label={t("admin_product_details_ar")}>
                <Textarea
                  dir="rtl"
                  rows={3}
                  value={form.details_ar}
                  onChange={(e) => setForm((f) => ({ ...f, details_ar: e.target.value }))}
                />
              </Field>
            </div>
          </BentoPanel>

          <BentoPanel className="space-y-4 p-5">
            <SectionTitle>{t("admin_product_pricing")}</SectionTitle>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label={`${t("admin_product_price")} (DA)`}>
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
              </Field>
              <Field label={`${t("admin_product_compare_price")} (DA)`}>
                <Input
                  type="number"
                  min={0}
                  value={form.compare_at_price}
                  onChange={(e) => setForm((f) => ({ ...f, compare_at_price: e.target.value }))}
                />
              </Field>
              <Field label={t("admin_product_stock")}>
                <Input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                />
              </Field>
            </div>
          </BentoPanel>

          <BentoPanel className="space-y-4 p-5">
            <SectionTitle>{t("admin_product_variants")}</SectionTitle>
            <Field label={t("admin_variant_colors")}>
              <ColorVariantsEditor colors={colors} onChange={setColors} />
            </Field>
            <ChipListEditor
              labelKey="admin_variant_sizes"
              placeholderKey="admin_variant_size_placeholder"
              values={sizes}
              onChange={setSizes}
            />
            <div className="border-t border-line pt-4">
              <p className="mb-3 text-sm font-semibold text-ink">
                {t("admin_variant_group_title")}
              </p>
              <CustomVariantsEditor groups={variantGroups} onChange={setVariantGroups} />
            </div>
          </BentoPanel>

          <BentoPanel className="space-y-4 p-5">
            <SectionTitle>{t("admin_product_offers")}</SectionTitle>
            <OffersEditor offers={offers} onChange={setOffers} />
          </BentoPanel>

          <BentoPanel className="space-y-5 p-5">
            <SectionTitle>{t("admin_product_media")}</SectionTitle>

            <Field label={t("admin_product_images")}>
              <div className="flex flex-wrap gap-3">
                {images.map((img) => (
                  <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-line">
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-muted hover:border-brand hover:text-brand">
                  <Upload size={16} />
                  <span className="text-[10px]">{uploading ? "..." : t("admin_product_upload")}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
            </Field>

            <Field label={t("admin_product_video")} hint={t("admin_video_hint")}>
              {videoUrl ? (
                <div className="space-y-2">
                  <video
                    src={videoUrl}
                    controls
                    preload="metadata"
                    className="max-h-64 w-full rounded-xl border border-line bg-panel-2"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={() => setVideoUrl(null)}>
                    <Trash2 size={14} />
                    {t("admin_remove")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm font-semibold text-muted hover:border-brand hover:text-brand">
                    <Film size={16} />
                    {uploadingVideo ? "..." : t("admin_upload_video")}
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={handleVideoUpload}
                      disabled={uploadingVideo}
                    />
                  </label>
                  {/* Escape hatch from Supabase egress: paste a video hosted on
                      Cloudinary/Bunny/etc. The player only needs a URL. */}
                  <Input
                    type="url"
                    placeholder={t("admin_video_url_placeholder")}
                    onChange={(e) => setVideoUrl(e.target.value.trim() || null)}
                  />
                </div>
              )}
            </Field>
          </BentoPanel>
        </div>

        <div className="space-y-4">
          <BentoPanel className="space-y-4 p-5">
            <SectionTitle>{t("admin_publishing")}</SectionTitle>
            <Field label={t("admin_product_category")}>
              <Select
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_fr}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("admin_product_status")}>
              <Select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "draft" }))}
              >
                <option value="draft">{t("admin_product_status_draft")}</option>
                <option value="active">{t("admin_product_status_active")}</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              />
              {t("admin_product_featured")}
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {t("admin_save")}
            </Button>
          </BentoPanel>
        </div>
      </div>
    </div>
  );
}
