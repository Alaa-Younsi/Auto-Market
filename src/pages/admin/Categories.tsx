import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/utils";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Category } from "@/types/db";

const EMPTY_FORM = { name_fr: "", name_ar: "", sort_order: 0 };

export default function AdminCategories() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  function startCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function startEdit(cat: Category) {
    setEditing(cat);
    setForm({ name_fr: cat.name_fr, name_ar: cat.name_ar, sort_order: cat.sort_order });
    setShowForm(true);
  }

  async function handleSave() {
    if (editing) {
      await supabase
        .from("categories")
        .update({ name_fr: form.name_fr, name_ar: form.name_ar, sort_order: form.sort_order })
        .eq("id", editing.id);
    } else {
      await supabase.from("categories").insert({
        name_fr: form.name_fr,
        name_ar: form.name_ar,
        slug: slugify(form.name_fr),
        sort_order: form.sort_order,
      });
    }
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    if (!confirm(t("admin_confirm_delete"))) return;
    await supabase.from("categories").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-extrabold text-ink">
          {t("admin_categories_title")}
        </h1>
        <Button onClick={startCreate} size="sm">
          <Plus size={16} />
          {t("admin_add")}
        </Button>
      </div>

      {showForm && (
        <BentoPanel className="mb-6 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              placeholder={t("admin_category_name_fr")}
              value={form.name_fr}
              onChange={(e) => setForm((f) => ({ ...f, name_fr: e.target.value }))}
            />
            <Input
              placeholder={t("admin_category_name_ar")}
              dir="rtl"
              value={form.name_ar}
              onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
            />
            <Input
              type="number"
              placeholder="Sort order"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleSave} size="sm">
              {t("admin_save")}
            </Button>
            <Button onClick={() => setShowForm(false)} variant="secondary" size="sm">
              {t("admin_cancel")}
            </Button>
          </div>
        </BentoPanel>
      )}

      <BentoPanel className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-start text-xs text-muted">
              <th className="px-4 py-3 text-start font-semibold">FR</th>
              <th className="px-4 py-3 text-start font-semibold">AR</th>
              <th className="px-4 py-3 text-end font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{cat.name_fr}</td>
                <td className="px-4 py-3" dir="rtl">
                  {cat.name_ar}
                </td>
                <td className="px-4 py-3 text-end">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => startEdit(cat)}
                      className="rounded-lg p-1.5 text-muted hover:bg-panel-2 hover:text-brand"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
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
