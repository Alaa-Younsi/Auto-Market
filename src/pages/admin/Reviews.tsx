import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Upload } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useReviews } from "@/hooks/useReviews";
import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/image";
import { cn } from "@/lib/utils";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { SmartImage } from "@/components/ui/SmartImage";
import { StarRating } from "@/components/ui/StarRating";

const EMPTY_FORM = {
  client_name: "",
  stars: 5,
  review_text: "",
  image_url: null as string | null,
};

export default function AdminReviews() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: reviews = [] } = useReviews({ activeOnly: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const optimized = await compressImage(file);
      const path = `reviews/${crypto.randomUUID()}-${optimized.name}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, optimized, { cacheControl: "31536000", contentType: optimized.type });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: publicUrl.publicUrl }));
    } catch {
      setError(t("admin_save_error"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleCreate() {
    setError(null);
    const { error: saveError } = await supabase.from("client_reviews").insert({
      client_name: form.client_name,
      stars: form.stars,
      review_text: form.review_text,
      image_url: form.image_url,
      active: true,
    });
    if (saveError) {
      setError(t("admin_save_error"));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  async function toggleActive(id: string, active: boolean) {
    const { error: updError } = await supabase
      .from("client_reviews")
      .update({ active: !active })
      .eq("id", id);
    if (updError) {
      setError(t("admin_save_error"));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
  }

  async function handleDelete(id: string) {
    if (!confirm(t("admin_confirm_delete"))) return;
    const { error: delError } = await supabase.from("client_reviews").delete().eq("id", id);
    if (delError) {
      setError(t("admin_delete_error"));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("admin_reviews_title")}
        </h1>
        <Button onClick={() => setShowForm((v) => !v)} size="sm">
          <Plus size={16} />
          {t("admin_add")}
        </Button>
      </div>

      {showForm && (
        <BentoPanel className="mb-6 space-y-3 p-5">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-line bg-panel-2">
              {form.image_url && (
                <SmartImage
                  src={form.image_url}
                  alt=""
                  sizes="56px"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-xs font-semibold text-muted hover:border-brand hover:text-brand">
              <Upload size={14} />
              {uploading ? "..." : t("admin_product_upload")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
          <Input
            placeholder={t("admin_review_client_name")}
            value={form.client_name}
            onChange={(e) => setForm((f) => ({ ...f, client_name: e.target.value }))}
          />
          <Select
            value={form.stars}
            onChange={(e) => setForm((f) => ({ ...f, stars: Number(e.target.value) }))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </Select>
          <Textarea
            placeholder={t("admin_review_text")}
            rows={3}
            value={form.review_text}
            onChange={(e) => setForm((f) => ({ ...f, review_text: e.target.value }))}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleCreate} size="sm">
            {t("admin_save")}
          </Button>
        </BentoPanel>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <BentoPanel key={review.id} className={cn("p-5", !review.active && "opacity-50")}>
            <StarRating value={review.stars} />
            <p className="mt-2 text-sm text-ink">"{review.review_text}"</p>
            <div className="mt-2 flex items-center gap-2">
              {review.image_url ? (
                <SmartImage
                  src={review.image_url}
                  alt=""
                  sizes="28px"
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                  {review.client_name.charAt(0)}
                </div>
              )}
              <p className="text-sm font-semibold text-muted">{review.client_name}</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                onClick={() => toggleActive(review.id, review.active)}
                className="text-xs font-semibold text-brand hover:underline"
              >
                {review.active ? t("admin_review_active") : "—"}
              </button>
              <button
                onClick={() => handleDelete(review.id)}
                className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-red-500"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </BentoPanel>
        ))}
      </div>
    </div>
  );
}
