import { type FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { TranslationKey } from "@/i18n/translations";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const MIN_LENGTH = 8;

/** GoTrue returns English sentences with no stable codes; map the known ones. */
function updateErrorKey(message: string): TranslationKey {
  const m = message.toLowerCase();
  if (m.includes("different")) return "account_same_password";
  if (m.includes("at least") || m.includes("short") || m.includes("weak"))
    return "account_too_short";
  return "admin_save_error";
}

/**
 * The signed-in admin's own account: email + change password. The current
 * password is re-checked before the change — `updateUser` alone only needs the
 * session, so anyone at an unattended open dashboard could otherwise lock the
 * owner out of their own shop.
 */
export default function AdminAccount() {
  const { t } = useLanguage();
  const { session } = useAuth();
  const email = session?.user.email ?? "";

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; key: TranslationKey } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (next.length < MIN_LENGTH) return setStatus({ tone: "error", key: "account_too_short" });
    if (next !== confirm) return setStatus({ tone: "error", key: "account_mismatch" });
    if (next === current) return setStatus({ tone: "error", key: "account_same_password" });

    setBusy(true);
    // A failed sign-in returns an error without disturbing the session we hold.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (authError) {
      setBusy(false);
      return setStatus({ tone: "error", key: "account_wrong_password" });
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) return setStatus({ tone: "error", key: updateErrorKey(error.message) });

    setCurrent("");
    setNext("");
    setConfirm("");
    setStatus({ tone: "ok", key: "account_saved" });
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-heading text-2xl font-extrabold text-ink">{t("account_title")}</h1>

      <BentoPanel className="mb-4 p-5">
        <p className="text-xs text-muted">{t("account_email")}</p>
        <p className="mt-1 font-semibold text-ink" dir="ltr">
          {email}
        </p>
      </BentoPanel>

      <BentoPanel className="p-5">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-base font-bold text-ink">
          <KeyRound size={17} className="text-brand" />
          {t("account_change_password")}
        </h2>
        <form onSubmit={onSubmit} className="space-y-3">
          {/* Hidden username so password managers update the right entry. */}
          <input type="email" value={email} autoComplete="username" readOnly hidden />
          <Input
            type="password"
            autoComplete="current-password"
            placeholder={t("account_current_password")}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t("account_new_password")}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={MIN_LENGTH}
            required
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder={t("account_confirm_password")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {status && (
            <p
              className={
                status.tone === "ok" ? "text-sm font-semibold text-accent" : "text-sm text-red-500"
              }
            >
              {t(status.key)}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "..." : t("account_submit")}
          </Button>
        </form>
      </BentoPanel>
    </div>
  );
}
