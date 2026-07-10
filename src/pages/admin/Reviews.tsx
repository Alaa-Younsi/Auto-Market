import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useReviews } from "@/hooks/useReviews";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";

const EMPTY_FORM = { client_name: "", stars: 5, review_text: "" };

export default function AdminReviews() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: reviews = [] } = useReviews({ activeOnly: false });
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  async function handleCreate() {
    await supabase.from("client_reviews").insert({
      client_name: form.client_name,
      stars: form.stars,
      review_text: form.review_text,
      active: true,
    });
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
    setForm(EMPTY_FORM);
    setShowForm(false);
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("client_reviews").update({ active: !active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["reviews"] });
  }

  async function handleDelete(id: string) {
    if (!confirm(t("admin_confirm_delete"))) return;
    await supabase.from("client_reviews").delete().eq("id", id);
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
          <Button onClick={handleCreate} size="sm">
            {t("admin_save")}
          </Button>
        </BentoPanel>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <BentoPanel
            key={review.id}
            className={cn("p-5", !review.active && "opacity-50")}
          >
            <StarRating value={review.stars} />
            <p className="mt-2 text-sm text-ink">"{review.review_text}"</p>
            <p className="mt-2 text-sm font-semibold text-muted">{review.client_name}</p>
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
