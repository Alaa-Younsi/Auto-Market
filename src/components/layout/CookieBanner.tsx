import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useConsentStore } from "@/store/consent";
import { Toggle } from "@/components/ui/Toggle";

/**
 * Consent banner, bottom START corner (the WhatsApp button owns the end
 * corner). Accept and Refuse are the same size — refusing must be as easy as
 * accepting. No overlay, appears after 1.2 s so it never competes with the
 * hero for the first paint, position-only animation.
 */
export function CookieBanner() {
  const { t } = useLanguage();
  const { status, ads, panelOpen, acceptAll, refuseAll, save, closePanel } = useConsentStore();
  const [ready, setReady] = useState(false);
  const [custom, setCustom] = useState(false);
  const [adsChoice, setAdsChoice] = useState(ads);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(id);
  }, []);

  // Reopened from "Gérer les cookies": go straight to the detailed choice.
  useEffect(() => {
    if (!panelOpen) return;
    setAdsChoice(ads);
    setCustom(true);
  }, [panelOpen, ads]);

  const open = panelOpen || (ready && status === "unset");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-labelledby="cookie-title"
          initial={{ y: 40 }}
          animate={{ y: 0 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 260 }}
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[45] rounded-2xl border border-line bg-panel p-4 shadow-2xl sm:inset-x-auto sm:start-6 sm:bottom-6 sm:w-[24rem] sm:p-5"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
              <Cookie size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="cookie-title" className="font-heading text-sm font-bold text-ink">
                {t("cookie_title")}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {t("cookie_text")}{" "}
                <Link
                  to="/cookies"
                  onClick={closePanel}
                  className="font-semibold text-brand hover:underline"
                >
                  {t("cookie_learn_more")}
                </Link>
              </p>
            </div>
            {status !== "unset" && (
              <button
                type="button"
                onClick={closePanel}
                className="-m-1 rounded-full p-1 text-muted hover:text-ink"
                aria-label={t("admin_cancel")}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {custom && (
            <div className="mt-4 space-y-3 rounded-xl bg-panel-2 p-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{t("cookie_essential")}</p>
                  <p className="text-muted">{t("cookie_essential_text")}</p>
                </div>
                <span className="shrink-0 font-semibold text-accent">{t("cookie_always_on")}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{t("cookie_ads")}</p>
                  <p className="text-muted">{t("cookie_ads_text")}</p>
                </div>
                <Toggle
                  checked={adsChoice}
                  onChange={() => setAdsChoice((v) => !v)}
                  aria-label={t("cookie_ads")}
                />
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={refuseAll}
              className="rounded-xl border border-line px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink/40"
            >
              {t("cookie_refuse")}
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="rounded-xl bg-brand px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              {t("cookie_accept")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => (custom ? save(adsChoice) : setCustom(true))}
            className="mt-2 w-full rounded-xl px-3 py-2 text-xs font-semibold text-muted transition-colors hover:text-brand"
          >
            {custom ? t("cookie_save") : t("cookie_customize")}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
