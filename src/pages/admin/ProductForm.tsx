import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2, Upload } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { ProductImage } from "@/types/db";

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
  colors: string;
  sizes: string;
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
  colors: "",
  sizes: "",
  featured: false,
  status: "draft",
};

export default function AdminProductForm() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const { data: categories = [] } = useCategories();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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
          colors: (data.colors ?? []).join(", "),
          sizes: (data.sizes ?? []).join(", "),
          featured: data.featured,
          status: data.status,
        });
        setImages(data.product_images ?? []);
      });
  }, [id, isNew]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `products/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
      setImages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), product_id: id ?? "", url: publicUrl.publicUrl, alt: null, sort_order: prev.length },
      ]);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(imageId: string) {
    setImages((prev) => prev.filter((img) => img.id !== imageId));
  }

  async function handleSave() {
    setSaving(true);
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
        colors: form.colors.split(",").map((s) => s.trim()).filter(Boolean),
        sizes: form.sizes.split(",").map((s) => s.trim()).filter(Boolean),
        featured: form.featured,
        status: form.status,
      };

      let productId = id;
      if (isNew) {
        const { data, error } = await supabase
          .from("products")
          .insert({ ...payload, slug: slugify(form.name_fr) })
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                placeholder={t("admin_product_name_fr")}
                value={form.name_fr}
                onChange={(e) => setForm((f) => ({ ...f, name_fr: e.target.value }))}
              />
              <Input
                placeholder={t("admin_product_name_ar")}
                dir="rtl"
                value={form.name_ar}
                onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Textarea
                placeholder={t("admin_product_description_fr")}
                rows={3}
                value={form.description_fr}
                onChange={(e) => setForm((f) => ({ ...f, description_fr: e.target.value }))}
              />
              <Textarea
                placeholder={t("admin_product_description_ar")}
                dir="rtl"
                rows={3}
                value={form.description_ar}
                onChange={(e) => setForm((f) => ({ ...f, description_ar: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Textarea
                placeholder="Détails (un par ligne, FR)"
                rows={3}
                value={form.details_fr}
                onChange={(e) => setForm((f) => ({ ...f, details_fr: e.target.value }))}
              />
              <Textarea
                placeholder="التفاصيل (سطر لكل نقطة، AR)"
                dir="rtl"
                rows={3}
                value={form.details_ar}
                onChange={(e) => setForm((f) => ({ ...f, details_ar: e.target.value }))}
              />
            </div>
          </BentoPanel>

          <BentoPanel className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                type="number"
                placeholder={t("admin_product_price")}
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
              <Input
                type="number"
                placeholder={t("admin_product_compare_price")}
                value={form.compare_at_price}
                onChange={(e) => setForm((f) => ({ ...f, compare_at_price: e.target.value }))}
              />
              <Input
                type="number"
                placeholder={t("admin_product_stock")}
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                placeholder={t("admin_product_colors")}
                value={form.colors}
                onChange={(e) => setForm((f) => ({ ...f, colors: e.target.value }))}
              />
              <Input
                placeholder={t("admin_product_sizes")}
                value={form.sizes}
                onChange={(e) => setForm((f) => ({ ...f, sizes: e.target.value }))}
              />
            </div>
          </BentoPanel>

          <BentoPanel className="p-5">
            <p className="mb-3 text-sm font-semibold text-ink">{t("admin_product_images")}</p>
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
          </BentoPanel>
        </div>

        <div className="space-y-4">
          <BentoPanel className="space-y-4 p-5">
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">{t("admin_product_category")}</p>
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
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">{t("admin_product_status")}</p>
              <Select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "active" | "draft" }))}
              >
                <option value="draft">{t("admin_product_status_draft")}</option>
                <option value="active">{t("admin_product_status_active")}</option>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              />
              {t("admin_product_featured")}
            </label>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {t("admin_save")}
            </Button>
          </BentoPanel>
        </div>
      </div>
    </div>
  );
}
