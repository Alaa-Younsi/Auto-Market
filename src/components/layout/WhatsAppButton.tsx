import { useLocation } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageProvider";
import { CONTACT_WHATSAPP_HREF } from "@/lib/contact";
import { WhatsAppIcon } from "@/components/ui/SocialIcons";

/**
 * Floating WhatsApp chat button on the reading END side: bottom-right in
 * French, bottom-left in Arabic. Pinned to the physical right it sat on top of
 * the start of every RTL layout (gallery thumbnails, form fields). On a product page the pre-filled
 * message names the product link, so the reply can start from it.
 * Sits under the cart drawer (z-40/50) so an open drawer covers it.
 */
export function WhatsAppButton() {
  const { t } = useLanguage();
  const { pathname } = useLocation();

  const page = pathname.startsWith("/product/") ? ` ${window.location.origin}${pathname}` : "";
  const href = `${CONTACT_WHATSAPP_HREF}?text=${encodeURIComponent(t("whatsapp_prefill") + page)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("whatsapp_cta")}
      className="group fixed bottom-[max(1rem,env(safe-area-inset-bottom))] end-4 z-30 flex items-center gap-2 sm:bottom-6 sm:end-6"
    >
      <span className="pointer-events-none hidden translate-x-2 rounded-full rtl:-translate-x-2 bg-panel px-3.5 py-2 text-sm font-semibold text-ink opacity-0 shadow-card ring-1 ring-line transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:block">
        {t("whatsapp_cta")}
      </span>
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_28px_-6px_rgb(37_211_102/0.65)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
        <span
          aria-hidden="true"
          className="fx-wa-ring absolute inset-0 rounded-full border-2 border-[#25D366]"
        />
        <WhatsAppIcon size={28} />
      </span>
    </a>
  );
}
