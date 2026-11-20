import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageProvider";

/** Under every confirm-order button: placing the order accepts the CGV (loi 18-05). */
export function LegalAcceptance() {
  const { t } = useLanguage();
  return (
    <p className="text-center text-[11px] leading-relaxed text-muted">
      {t("checkout_legal_accept_pre")}{" "}
      <Link to="/cgv" className="underline underline-offset-2 hover:text-brand">
        {t("checkout_legal_cgv")}
      </Link>{" "}
      {t("checkout_legal_and")}{" "}
      <Link to="/confidentialite" className="underline underline-offset-2 hover:text-brand">
        {t("checkout_legal_privacy")}
      </Link>
      .
    </p>
  );
}
