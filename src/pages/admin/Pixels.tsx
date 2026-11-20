import { type FormEvent, useState } from "react";
import { Pencil, Plus, Radio, Trash2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { useAllPixelsAdmin, useDeletePixel, useSavePixel } from "@/hooks/useTrackingPixels";
import { readDbError } from "@/lib/dbError";
import { cn } from "@/lib/utils";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Toggle } from "@/components/ui/Toggle";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import type {
  TrackingEventKey,
  TrackingPixel,
  TrackingPixelInput,
  TrackingProvider,
  TrackingScope,
} from "@/types/db";

const EVENT_KEYS: { key: TrackingEventKey; label: TranslationKey }[] = [
  { key: "page_view", label: "pixels_event_page_view" },
  { key: "view_content", label: "pixels_event_view_content" },
  { key: "add_to_cart", label: "pixels_event_add_to_cart" },
  { key: "initiate_checkout", label: "pixels_event_initiate_checkout" },
  { key: "purchase", label: "pixels_event_purchase" },
];

const ALL_EVENTS_ON: Record<TrackingEventKey, boolean> = {
  page_view: true,
  view_content: true,
  add_to_cart: true,
  initiate_checkout: true,
  purchase: true,
};

/** Same rules as the DB check constraint, so the form says it before the save does. */
const ID_PATTERN: Record<TrackingProvider, RegExp> = {
  meta: /^\d{10,20}$/,
  tiktok: /^[A-Z0-9]{10,40}$/,
};

interface FormState {
  provider: TrackingProvider;
  label: string;
  pixel_id: string;
  active: boolean;
  scope: TrackingScope;
  matchText: string;
  events: Record<TrackingEventKey, boolean>;
  sort_order: string;
  notes: string;
}

const EMPTY: FormState = {
  provider: "meta",
  label: "",
  pixel_id: "",
  active: true,
  scope: "all",
  matchText: "",
  events: ALL_EVENTS_ON,
  sort_order: "0",
  notes: "",
};

function toForm(p: TrackingPixel): FormState {
  return {
    provider: p.provider,
    label: p.label,
    pixel_id: p.pixel_id,
    active: p.active,
    scope: p.scope,
    matchText: (p.match_values ?? []).join("\n"),
    events: { ...ALL_EVENTS_ON, ...p.events },
    sort_order: String(p.sort_order ?? 0),
    notes: p.notes ?? "",
  };
}

/** Explicit column mapper — never spread a loaded row into a write. */
function toInput(f: FormState): TrackingPixelInput {
  return {
    provider: f.provider,
    label: f.label.trim(),
    pixel_id: f.pixel_id.trim(),
    active: f.active,
    scope: f.scope,
    // One value per line; ignored entirely when the scope is "all".
    match_values:
      f.scope === "all"
        ? []
        : f.matchText
            .split("\n")
            .map((v) => v.trim())
            .filter(Boolean),
    events: f.events,
    sort_order: Math.floor(Number(f.sort_order) || 0),
    notes: f.notes.trim() || null,
  };
}

function scopeSummary(p: TrackingPixel, t: (k: TranslationKey) => string): string {
  if (p.scope === "all") return t("pixels_scope_all");
  const n = p.match_values?.length ?? 0;
  const base = p.scope === "paths" ? t("pixels_scope_paths") : t("pixels_scope_products");
  return n === 0 ? `${base} · ${t("pixels_scope_every")}` : `${base} · ${n}`;
}

export default function AdminPixels() {
  const { t } = useLanguage();
  const { data: pixels = [], isLoading, isError } = useAllPixelsAdmin();
  const save = useSavePixel();
  const del = useDeletePixel();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const idValid = ID_PATTERN[form.provider].test(form.pixel_id.trim());
  const canSave = form.label.trim().length > 0 && idValid;

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(p: TrackingPixel) {
    setEditingId(p.id);
    setForm(toForm(p));
    setError(null);
    setFormOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setError(null);
    try {
      await save.mutateAsync({ id: editingId, values: toInput(form) });
      setFormOpen(false);
    } catch (err) {
      const { code, message } = readDbError(err);
      setError(
        code === "23505" || message.includes("tracking_pixels_unique")
          ? t("pixels_error_duplicate")
          : code === "23514" || message.includes("tracking_pixels_id_format")
            ? t("pixels_error_id")
            : t("admin_save_error")
      );
    }
  }

  async function toggleActive(p: TrackingPixel) {
    setError(null);
    try {
      await save.mutateAsync({ id: p.id, values: toInput({ ...toForm(p), active: !p.active }) });
    } catch {
      setError(t("admin_save_error"));
    }
  }

  const [confirmDialog, ask] = useConfirm();

  async function remove(p: TrackingPixel) {
    const ok = await ask({
      title: `${t("admin_delete")} « ${p.label} »`,
      body: <p>{t("pixels_confirm_delete")}</p>,
      confirmLabel: t("admin_delete"),
    });
    if (!ok) return;
    setError(null);
    try {
      await del.mutateAsync(p.id);
    } catch {
      setError(t("admin_delete_error"));
    }
  }

  return (
    <div className="max-w-4xl">
      {confirmDialog}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-extrabold text-ink">{t("pixels_title")}</h1>
        {!formOpen && !isError && (
          <Button size="sm" onClick={openNew}>
            <Plus size={16} />
            {t("pixels_add")}
          </Button>
        )}
      </div>
      <p className="mb-6 max-w-2xl text-sm text-muted">{t("pixels_intro")}</p>

      {isError && (
        <BentoPanel className="mb-6 border-amber-500/40 p-5 text-sm text-amber-500">
          {t("pixels_missing_table")}
        </BentoPanel>
      )}

      {error && !formOpen && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {formOpen && (
        <BentoPanel className="mb-6 p-5">
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="font-heading text-base font-bold text-ink">
              {editingId ? t("pixels_edit") : t("pixels_add")}
            </h2>

            {/* Provider */}
            <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
              {(["meta", "tiktok"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, provider: p }))}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors",
                    form.provider === p
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-line text-muted hover:bg-panel-2"
                  )}
                >
                  {p === "meta" ? "Meta (Facebook / Instagram)" : "TikTok"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-ink">{t("pixels_label")}</span>
                <Input
                  value={form.label}
                  maxLength={80}
                  placeholder={t("pixels_label_placeholder")}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-ink">{t("pixels_id")}</span>
                <Input
                  value={form.pixel_id}
                  dir="ltr"
                  inputMode={form.provider === "meta" ? "numeric" : "text"}
                  placeholder={form.provider === "meta" ? "123456789012345" : "C4ABCDEFGH12345678"}
                  error={form.pixel_id.trim() && !idValid ? t("pixels_error_id") : undefined}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pixel_id:
                        f.provider === "tiktok" ? e.target.value.toUpperCase() : e.target.value,
                    }))
                  }
                />
                <span className="mt-1 block text-xs text-muted">
                  {form.provider === "meta" ? t("pixels_id_hint_meta") : t("pixels_id_hint_tiktok")}
                </span>
              </label>
            </div>

            {/* Targeting */}
            <label className="block text-sm sm:max-w-sm">
              <span className="mb-1.5 block font-semibold text-ink">{t("pixels_scope")}</span>
              <Select
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as TrackingScope }))}
              >
                <option value="all">{t("pixels_scope_all")}</option>
                <option value="paths">{t("pixels_scope_paths")}</option>
                <option value="products">{t("pixels_scope_products")}</option>
              </Select>
            </label>
            {form.scope !== "all" && (
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-ink">{t("pixels_match")}</span>
                <Textarea
                  rows={3}
                  dir="ltr"
                  value={form.matchText}
                  placeholder={
                    form.scope === "paths" ? "/shop" : "antivol-frein-a-main-levier-vitesse"
                  }
                  onChange={(e) => setForm((f) => ({ ...f, matchText: e.target.value }))}
                />
                <span className="mt-1 block text-xs text-muted">
                  {form.scope === "paths"
                    ? t("pixels_match_hint_paths")
                    : t("pixels_match_hint_products")}
                </span>
              </label>
            )}

            {/* Events */}
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink">{t("pixels_events")}</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {EVENT_KEYS.map((ev) => (
                  <label
                    key={ev.key}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                      form.events[ev.key]
                        ? "border-brand/50 bg-brand/5 text-ink"
                        : "border-line text-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={form.events[ev.key]}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          events: { ...f.events, [ev.key]: e.target.checked },
                        }))
                      }
                    />
                    {t(ev.label)}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-ink">{t("pixels_order")}</span>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-semibold text-ink">{t("pixels_notes")}</span>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>
            </div>

            <label className="flex w-fit items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              {t("pixels_active")}
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!canSave || save.isPending}>
                {save.isPending ? "..." : t("admin_save")}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                {t("admin_cancel")}
              </Button>
            </div>
          </form>
        </BentoPanel>
      )}

      {isLoading && <p className="text-sm text-muted">{t("loading")}</p>}

      {!isLoading && !isError && pixels.length === 0 && !formOpen && (
        <BentoPanel className="flex flex-col items-center gap-3 p-10 text-center">
          <Radio size={28} className="text-brand" />
          <p className="max-w-sm text-sm text-muted">{t("pixels_empty")}</p>
          <Button size="sm" onClick={openNew}>
            <Plus size={16} />
            {t("pixels_add")}
          </Button>
        </BentoPanel>
      )}

      <div className="space-y-3">
        {pixels.map((p) => (
          <BentoPanel key={p.id} className={cn("p-4 sm:p-5", !p.active && "opacity-60")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={p.provider === "meta" ? "brand" : "muted"}>
                    {p.provider === "meta" ? "Meta" : "TikTok"}
                  </Badge>
                  <p className="font-heading text-sm font-bold text-ink">{p.label}</p>
                </div>
                <p className="mt-1 font-mono text-xs text-muted" dir="ltr">
                  {p.pixel_id}
                </p>
                <p className="mt-1 text-xs text-muted">{scopeSummary(p, t)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {EVENT_KEYS.filter((ev) => p.events?.[ev.key] !== false).map((ev) => (
                    <span
                      key={ev.key}
                      className="rounded-md bg-panel-2 px-2 py-0.5 text-[11px] font-medium text-muted"
                    >
                      {t(ev.label)}
                    </span>
                  ))}
                </div>
                {p.notes && <p className="mt-2 text-xs italic text-muted">{p.notes}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Toggle
                  checked={p.active}
                  onChange={() => toggleActive(p)}
                  disabled={save.isPending}
                  aria-label={`${p.label}: ${t("pixels_active")}`}
                />
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="rounded-lg p-2 text-muted hover:bg-panel-2 hover:text-ink"
                  aria-label={t("admin_edit")}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(p)}
                  className="rounded-lg p-2 text-muted hover:bg-red-500/10 hover:text-red-500"
                  aria-label={t("admin_delete")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </BentoPanel>
        ))}
      </div>
    </div>
  );
}
