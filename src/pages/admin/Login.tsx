import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BentoPanel } from "@/components/ui/BentoPanel";
import { BrandMark } from "@/components/ui/BrandMark";

export default function AdminLogin() {
  const { t } = useLanguage();
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      // In dev, show Supabase's real message (e.g. "Email not confirmed")
      // instead of the generic one — makes local auth issues diagnosable.
      setError(import.meta.env.DEV ? signInError : t("admin_login_error"));
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <BentoPanel className="w-full max-w-sm p-7">
        <div className="mb-6 text-center">
          <BrandMark className="mx-auto mb-3 h-12 w-12 rounded-2xl" />
          <h1 className="font-heading text-lg font-extrabold text-ink">{t("admin_login_title")}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder={t("admin_email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder={t("admin_password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {t("admin_login_submit")}
          </Button>
        </form>
      </BentoPanel>
    </div>
  );
}
