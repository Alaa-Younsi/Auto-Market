import { type FormEvent, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/lib/supabase";
import { deleteAdminImage, uploadAdminImage } from "@/lib/image";
import { readDbError } from "@/lib/dbError";
import { invalidateTaxonomyCaches } from "@/lib/queryCache";
import { slugify } from "@/lib/utils";
import { Field } from "@/components/admin/Field";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { SmartImage } from "@/components/ui/SmartImage";
import type { Category } from "@/types/db";

interface FormState {
  name_fr: string;
  name_ar: string;
  description_fr: string;
  description_ar: string;
  sort_order: string;
  image_url: string | null;
}

const EMPTY: FormState = {
  name_fr: "",
  name_ar: "",
  description_fr: "",
  description_ar: "",
  sort_order: "0",
  image_url: null,
};

/** How many products sit in each category — shown on the card and in the delete dialog. */
function useCategoryCounts() {
  return useQuery({
    queryKey: ["admin-category-counts"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.from("products").select("category_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.category_id) counts[row.category_id] = (counts[row.category_id] ?? 0) + 1;
      }
      return counts;
    },
  });
}

function CategoryForm({
  editing,
  nextOrder,
  onDone,
}: {
  editing: Category | null;
  nextOrder: number;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(() =>
    editing
      ? {
          name_fr: editing.name_fr,
          name_ar: editing.name_ar,
          description_fr: editing.description_fr ?? "",
          description_ar: editing.description_ar ?? "",
          sort_order: String(editing.sort_order),
          image_url: editing.image_url,
        }
      : { ...EMPTY, sort_order: String(nextOrder) }
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<TranslationKey | null>(null);
  // Files uploaded in THIS form session that end up unused are cleaned up.
  const uploaded = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  // Internal identifier only (the shop filters by id): generated, never typed.
  const slug = editing?.slug ?? (slugify(form.name_fr) || `categorie-${Date.now().toString(36)}`);
  const errors: Partial<Record<"name_fr" | "name_ar" | "sort_order", TranslationKey>> = {};
  if (!form.name_fr.trim()) errors.name_fr = "category_error_name";
  if (!form.name_ar.trim()) errors.name_ar = "category_error_name";
  if (!/^-?\d{1,4}$/.test(form.sort_order.trim())) errors.sort_order = "category_error_order";
  const valid = Object.keys(errors).length === 0;
  const [showErrors, setShowErrors] = useState(false);
  const fieldError = (k: keyof typeof errors) =>
    showErrors && errors[k] ? t(errors[k] as TranslationKey) : undefined;

  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadAdminImage(file, "categories");
      uploaded.current.push(url);
      setForm((f) => ({ ...f, image_url: url }));
    } catch {
      setError("category_error_upload");
    } finally {
      setUploading(false);
    }
  }

  async function cancel() {
    for (const url of uploaded.current) void deleteAdminImage(url);
    onDone();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setShowErrors(true);
    if (!valid) return;
    setSaving(true);
    setError(null);
    const payload = {
      name_fr: form.name_fr.trim(),
      name_ar: form.name_ar.trim(),
      slug,
      description_fr: form.description_fr.trim() || null,
      description_ar: form.description_ar.trim() || null,
      sort_order: Number(form.sort_order),
      image_url: form.image_url,
    };
    const query = editing
      ? supabase.from("categories").update(payload).eq("id", editing.id).select("id")
      : supabase.from("categories").insert(payload).select("id");
    const { data, error: saveError } = await query;
    setSaving(false);
    if (saveError || !data?.length) {
      setError(
        readDbError(saveError).code === "23505" ? "category_error_slug_taken" : "admin_save_error"
      );
      return;
    }
    // The previous photo, and any upload that was replaced before saving.
    const keep = form.image_url;
    const stale = [...uploaded.current, editing?.image_url ?? null].filter(
      (u): u is string => !!u && u !== keep
    );
    for (const url of stale) void deleteAdminImage(url);
    uploaded.current = [];
    invalidateTaxonomyCaches(qc);
    onDone();
  }

  return (
    <BentoPanel className="mb-6 p-4 sm:p-5">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-base font-bold text-ink">
            {editing ? t("category_edit") : t("category_new")}
          </h2>
          <button
            type="button"
            onClick={cancel}
            className="rounded-full p-1.5 text-muted hover:bg-panel-2 hover:text-ink"
            aria-label={t("admin_cancel")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="shrink-0">
            <span className="mb-1.5 block text-xs font-semibold text-muted">
              {t("category_image")}
            </span>
            <div className="relative h-32 w-full overflow-hidden rounded-xl border border-line bg-panel-2 sm:w-40">
              {form.image_url ? (
                <SmartImage
                  src={form.image_url}
                  alt=""
                  sizes="160px"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted">
                  <ImageOff size={22} />
                </div>
              )}
              {uploading && (
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
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
                className="flex-1"
              >
                <ImagePlus size={15} />
                {form.image_url ? t("category_replace_image") : t("category_add_image")}
              </Button>
              {form.image_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={uploading}
                  onClick={() => setForm((f) => ({ ...f, image_url: null }))}
                  aria-label={t("category_remove_image")}
                  title={t("category_remove_image")}
                >
                  <Trash2 size={15} />
                </Button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              tabIndex={-1}
              onChange={onPick}
            />
          </div>

          <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("admin_category_name_fr")}>
              <Input
                value={form.name_fr}
                onChange={set("name_fr")}
                maxLength={60}
                error={fieldError("name_fr")}
              />
            </Field>
            <Field label={t("admin_category_name_ar")}>
              <Input
                dir="rtl"
                value={form.name_ar}
                onChange={set("name_ar")}
                maxLength={60}
                error={fieldError("name_ar")}
              />
            </Field>
            <Field
              label={t("admin_sort_order")}
              hint={t("category_order_hint")}
              className="sm:col-span-2"
            >
              <Input
                inputMode="numeric"
                value={form.sort_order}
                onChange={set("sort_order")}
                error={fieldError("sort_order")}
              />
            </Field>
            <Field label={t("category_description_fr")}>
              <Textarea
                rows={2}
                maxLength={300}
                value={form.description_fr}
                onChange={set("description_fr")}
              />
            </Field>
            <Field label={t("category_description_ar")}>
              <Textarea
                dir="rtl"
                rows={2}
                maxLength={300}
                value={form.description_ar}
                onChange={set("description_ar")}
              />
            </Field>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">{t(error)}</p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={cancel}>
            {t("admin_cancel")}
          </Button>
          <Button type="submit" disabled={saving || uploading}>
            {saving ? "…" : t("admin_save")}
          </Button>
        </div>
      </form>
    </BentoPanel>
  );
}

export default function AdminCategories() {
  const { t, lang } = useLanguage();
  const qc = useQueryClient();
  const { data: categories = [], isLoading, isError } = useCategories();
  const { data: counts = {} } = useCategoryCounts();
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const nextOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0) + 1;

  function open(cat: Category | null) {
    setEditing(cat);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    const { data, error } = await supabase
      .from("categories")
      .delete()
      .eq("id", toDelete.id)
      .select("id");
    setDeleting(false);
    if (error || !data?.length) {
      setDeleteError(t("admin_delete_error"));
      return;
    }
    void deleteAdminImage(toDelete.image_url);
    if (editing?.id === toDelete.id) setFormOpen(false);
    setToDelete(null);
    invalidateTaxonomyCaches(qc);
    qc.invalidateQueries({ queryKey: ["admin-category-counts"] });
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink">
            {t("admin_categories_title")}
          </h1>
          <p className="mt-1 text-sm text-muted">{t("category_intro")}</p>
        </div>
        <Button onClick={() => open(null)} size="sm" className="self-start sm:self-auto">
          <Plus size={16} />
          {t("admin_add")}
        </Button>
      </div>

      {formOpen && (
        <CategoryForm
          key={formKey}
          editing={editing}
          nextOrder={nextOrder}
          onDone={() => {
            setFormOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-category-counts"] });
          }}
        />
      )}

      {isLoading && <p className="text-muted">{t("loading")}</p>}
      {isError && <p className="text-red-500">{t("admin_load_error")}</p>}
      {!isLoading && !isError && categories.length === 0 && (
        <BentoPanel className="p-8 text-center text-sm text-muted">
          {t("category_empty")}
        </BentoPanel>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((cat) => {
          const n = counts[cat.id] ?? 0;
          return (
            <li key={cat.id}>
              <BentoPanel className="flex h-full gap-3 p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-line bg-panel-2">
                  {cat.image_url ? (
                    <SmartImage
                      src={cat.image_url}
                      alt=""
                      sizes="80px"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted">
                      <ImageOff size={18} />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="truncate font-semibold text-ink">
                    {lang === "ar" ? cat.name_ar : cat.name_fr}
                  </p>
                  <p className="truncate text-xs text-muted" dir={lang === "ar" ? "ltr" : "rtl"}>
                    {lang === "ar" ? cat.name_fr : cat.name_ar}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {n} {t(n === 1 ? "category_product_one" : "category_product_many")}
                    {!cat.image_url && (
                      <span className="text-amber-500"> · {t("category_no_image")}</span>
                    )}
                  </p>
                  <div className="mt-auto flex justify-end gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => open(cat)}
                      className="rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-brand"
                      aria-label={`${t("category_edit")} ${cat.name_fr}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setToDelete(cat);
                      }}
                      className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-500"
                      aria-label={`${t("admin_delete")} ${cat.name_fr}`}
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
        title={`${t("category_delete_title")} « ${toDelete ? (lang === "ar" ? toDelete.name_ar : toDelete.name_fr) : ""} »`}
        confirmLabel={t("admin_delete")}
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      >
        <p>
          {toDelete && (counts[toDelete.id] ?? 0) > 0
            ? `${counts[toDelete.id]} ${t("category_delete_products")}`
            : t("category_delete_empty")}
        </p>
      </ConfirmDialog>
    </div>
  );
}
