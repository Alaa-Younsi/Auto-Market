import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Send } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/translations";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";

interface Prefs {
  email_enabled: boolean;
  notify_email: string | null;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

function usePrefs(userId: string | undefined) {
  return useQuery({
    queryKey: ["notification-prefs", userId],
    enabled: !!userId,
    retry: 0,
    queryFn: async (): Promise<Prefs | null> => {
      const { data, error } = await supabase
        .from("admin_notification_prefs")
        .select("email_enabled, notify_email")
        .eq("user_id", userId as string)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

function PrefsForm({
  userId,
  initial,
  fallbackEmail,
}: {
  userId: string;
  initial: Prefs | null;
  fallbackEmail: string;
}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const [enabled, setEnabled] = useState(initial?.email_enabled ?? false);
  const [email, setEmail] = useState(initial?.notify_email ?? fallbackEmail);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; key: TranslationKey } | null>(null);
  const emailValid = EMAIL_RE.test(email.trim());

  async function save() {
    if (enabled && !emailValid) return;
    setBusy(true);
    setStatus(null);
    const { data, error } = await supabase
      .from("admin_notification_prefs")
      .upsert(
        { user_id: userId, email_enabled: enabled, notify_email: email.trim() || null },
        { onConflict: "user_id" }
      )
      .select("user_id");
    setBusy(false);
    if (error || !data?.length) {
      setStatus({ tone: "error", key: "admin_save_error" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["notification-prefs", userId] });
    setStatus({ tone: "ok", key: enabled ? "notify_saved_on" : "notify_saved_off" });
  }

  async function sendTest() {
    setTesting(true);
    setStatus(null);
    const { error } = await supabase.functions.invoke("notify", { body: { kind: "test" } });
    setTesting(false);
    if (!error) {
      setStatus({ tone: "ok", key: "notify_test_sent" });
      return;
    }
    let key: TranslationKey = "notify_test_failed";
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      if (res.status === 404) key = "notify_function_missing";
      else {
        const body = (await res.json().catch(() => ({}))) as { code?: string };
        if (body.code === "no_email") key = "notify_save_first";
      }
    } else {
      key = "notify_function_missing";
    }
    setStatus({ tone: "error", key });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{t("notify_email_toggle")}</p>
          <p className="text-xs text-muted">{t("notify_email_toggle_hint")}</p>
        </div>
        <Toggle
          checked={enabled}
          onChange={() => setEnabled((v) => !v)}
          aria-label={t("notify_email_toggle")}
        />
      </div>

      {enabled && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">
            {t("notify_email_address")}
          </span>
          <Input
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            error={email.trim() && !emailValid ? t("settings_error_email") : undefined}
          />
        </label>
      )}

      {status && (
        <p
          className={
            status.tone === "ok" ? "text-sm font-semibold text-accent" : "text-sm text-red-500"
          }
          role="status"
        >
          {t(status.key)}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          onClick={save}
          disabled={busy || (enabled && !emailValid)}
          className="sm:flex-1"
        >
          {busy ? "…" : t("admin_save")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={sendTest}
          disabled={testing || !initial?.email_enabled}
          className="sm:flex-1"
          title={!initial?.email_enabled ? t("notify_save_first") : undefined}
        >
          <Send size={15} />
          {testing ? "…" : t("notify_test")}
        </Button>
      </div>
      <p className="text-xs leading-relaxed text-muted">{t("notify_setup_hint")}</p>
    </div>
  );
}

export function NotificationSettings() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data, isLoading, isError } = usePrefs(userId);

  return (
    <BentoPanel className="p-5">
      <h2 className="mb-4 flex items-center gap-2 font-heading text-base font-bold text-ink">
        <BellRing size={17} className="text-brand" />
        {t("notify_title")}
      </h2>
      {isLoading && <p className="text-sm text-muted">{t("loading")}</p>}
      {isError && <p className="text-sm text-red-500">{t("settings_missing_migration")}</p>}
      {!isLoading && !isError && userId && (
        <PrefsForm
          userId={userId}
          initial={data ?? null}
          fallbackEmail={session?.user.email ?? ""}
        />
      )}
    </BentoPanel>
  );
}
