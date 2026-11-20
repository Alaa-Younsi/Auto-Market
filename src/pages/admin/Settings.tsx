import { type FormEvent, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/lib/supabase";
import { readDbError } from "@/lib/dbError";
import { Field, FormSection } from "@/components/admin/Field";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SETTINGS_TEXT_KEYS, type SettingsTextKey, type StoreSettings } from "@/types/db";

type FormState = Record<SettingsTextKey, string>;

const PHONE_RE = /^\+?[0-9 ]{9,20}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const URL_RE = /^https:\/\/[^\s"<>]+$/;

const SOCIALS: { key: SettingsTextKey; label: string; placeholder: string }[] = [
  { key: "social_instagram", label: "Instagram", placeholder: "https://www.instagram.com/…" },
  { key: "social_facebook", label: "Facebook", placeholder: "https://www.facebook.com/…" },
  { key: "social_tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@…" },
  { key: "social_youtube", label: "YouTube", placeholder: "https://www.youtube.com/@…" },
  { key: "social_snapchat", label: "Snapchat", placeholder: "https://www.snapchat.com/add/…" },
];

function toForm(row: StoreSettings | null | undefined): FormState {
  return Object.fromEntries(
    SETTINGS_TEXT_KEYS.map((k) => [k, (row?.[k] as string | null | undefined) ?? ""])
  ) as FormState;
}

function validate(f: FormState): Partial<Record<SettingsTextKey, TranslationKey>> {
  const errs: Partial<Record<SettingsTextKey, TranslationKey>> = {};
  if (f.contact_phone.trim() && !PHONE_RE.test(f.contact_phone.trim()))
    errs.contact_phone = "settings_error_phone";
  if (f.contact_whatsapp.trim() && !PHONE_RE.test(f.contact_whatsapp.trim()))
    errs.contact_whatsapp = "settings_error_phone";
  if (f.contact_email.trim() && !EMAIL_RE.test(f.contact_email.trim()))
    errs.contact_email = "settings_error_email";
  for (const s of SOCIALS) {
    const v = f[s.key].trim();
    if (v && !URL_RE.test(v)) errs[s.key] = "settings_error_url";
  }
  return errs;
}

function SettingsForm({ initial }: { initial: StoreSettings | null }) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; key: TranslationKey } | null>(null);
  const errors = validate(form);
  const hasErrors = Object.keys(errors).length > 0;

  const set = (k: SettingsTextKey) => (e: { target: { value: string } }) => {
    setStatus(null);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };
  const err = (k: SettingsTextKey) => (errors[k] ? t(errors[k]) : undefined);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (hasErrors) return;
    setBusy(true);
    setStatus(null);
    // Explicit column list (never a spread of the loaded row). Empty → NULL,
    // which the storefront reads as "not shown" (or the built-in fallback).
    const payload = Object.fromEntries(
      SETTINGS_TEXT_KEYS.map((k) => [k, form[k].trim() === "" ? null : form[k].trim()])
    );
    const { data, error } = await supabase
      .from("store_settings")
      .update(payload)
      .eq("id", 1)
      .select("id");
    setBusy(false);
    if (error || !data || data.length === 0) {
      const code = error ? readDbError(error).code : "";
      setStatus({
        tone: "error",
        key:
          code === "42703" || code === "PGRST204"
            ? "settings_missing_migration"
            : "admin_save_error",
      });
      return;
    }
    qc.invalidateQueries({ queryKey: ["store-settings"] });
    setStatus({ tone: "ok", key: "settings_saved" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-24">
      <FormSection title={t("settings_contact")} description={t("settings_contact_hint")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("settings_phone")} hint={t("settings_phone_hint")}>
            <Input
              dir="ltr"
              inputMode="tel"
              value={form.contact_phone}
              onChange={set("contact_phone")}
              placeholder="+213 555 00 00 00"
              error={err("contact_phone")}
            />
          </Field>
          <Field label={t("settings_whatsapp")} hint={t("settings_whatsapp_hint")}>
            <Input
              dir="ltr"
              inputMode="tel"
              value={form.contact_whatsapp}
              onChange={set("contact_whatsapp")}
              placeholder="+213 555 00 00 00"
              error={err("contact_whatsapp")}
            />
          </Field>
          <Field label={t("settings_email")} className="sm:col-span-2">
            <Input
              dir="ltr"
              type="email"
              value={form.contact_email}
              onChange={set("contact_email")}
              placeholder="contact@auto-market.shop"
              error={err("contact_email")}
            />
          </Field>
          <Field label={`${t("settings_address")} (FR)`}>
            <Input
              value={form.address_fr}
              onChange={set("address_fr")}
              maxLength={200}
              placeholder="Alger, Algérie"
            />
          </Field>
          <Field label={`${t("settings_address")} (AR)`}>
            <Input
              dir="rtl"
              value={form.address_ar}
              onChange={set("address_ar")}
              maxLength={200}
              placeholder="الجزائر العاصمة"
            />
          </Field>
          <Field label={`${t("settings_hours")} (FR)`}>
            <Input
              value={form.hours_fr}
              onChange={set("hours_fr")}
              maxLength={120}
              placeholder="Sam – Jeu, 9h – 19h"
            />
          </Field>
          <Field label={`${t("settings_hours")} (AR)`}>
            <Input
              dir="rtl"
              value={form.hours_ar}
              onChange={set("hours_ar")}
              maxLength={120}
              placeholder="السبت – الخميس، 9:00 – 19:00"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={t("settings_socials")} description={t("settings_socials_hint")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SOCIALS.map((s) => (
            <Field key={s.key} label={s.label}>
              <Input
                dir="ltr"
                type="url"
                value={form[s.key]}
                onChange={set(s.key)}
                placeholder={s.placeholder}
                error={err(s.key)}
              />
            </Field>
          ))}
        </div>
      </FormSection>

      <FormSection title={t("settings_legal")} description={t("settings_legal_hint")}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("settings_legal_name")}>
            <Input
              value={form.legal_name}
              onChange={set("legal_name")}
              maxLength={120}
              placeholder="Auto Market"
            />
          </Field>
          <Field label={t("settings_legal_owner")}>
            <Input value={form.legal_owner} onChange={set("legal_owner")} maxLength={120} />
          </Field>
          <Field label={t("settings_legal_rc")}>
            <Input dir="ltr" value={form.legal_rc} onChange={set("legal_rc")} maxLength={40} />
          </Field>
          <Field label={t("settings_legal_nif")}>
            <Input dir="ltr" value={form.legal_nif} onChange={set("legal_nif")} maxLength={40} />
          </Field>
          <Field label={t("settings_legal_nis")}>
            <Input dir="ltr" value={form.legal_nis} onChange={set("legal_nis")} maxLength={40} />
          </Field>
          <Field label={t("settings_legal_ai")}>
            <Input dir="ltr" value={form.legal_ai} onChange={set("legal_ai")} maxLength={40} />
          </Field>
        </div>
      </FormSection>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:px-6 lg:-mx-8 lg:px-8">
        {status && (
          <p
            role="status"
            className={
              status.tone === "ok" ? "text-sm font-semibold text-accent" : "text-sm text-red-500"
            }
          >
            {t(status.key)}
          </p>
        )}
        {hasErrors && !status && <p className="text-sm text-red-500">{t("settings_fix_errors")}</p>}
        <Button type="submit" disabled={busy || hasErrors} className="sm:min-w-40">
          <Save size={16} />
          {busy ? "…" : t("admin_save")}
        </Button>
      </div>
    </form>
  );
}

export default function AdminSettings() {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useStoreSettings();

  return (
    <div className="max-w-4xl">
      <h1 className="font-heading text-2xl font-extrabold text-ink">{t("settings_title")}</h1>
      <p className="mt-1 mb-6 text-sm text-muted">{t("settings_intro")}</p>
      {isLoading && <p className="text-muted">{t("loading")}</p>}
      {isError && <p className="text-red-500">{t("admin_load_error")}</p>}
      {/* Mounted once the row is loaded, so the form starts from it — no effect-driven setState. */}
      {!isLoading && !isError && <SettingsForm initial={data ?? null} />}
    </div>
  );
}
