import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { type SocialLink, useContact } from "@/hooks/useContact";
import { useConsentStore } from "@/store/consent";
import {
  FacebookIcon,
  InstagramIcon,
  SnapchatIcon,
  TikTokIcon,
  YouTubeIcon,
} from "@/components/ui/SocialIcons";
import { BrandMark } from "@/components/ui/BrandMark";

const SOCIAL_ICON: Record<SocialLink["key"], (p: { size?: number }) => ReactNode> = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  snapchat: SnapchatIcon,
};

export function Footer() {
  const { t } = useLanguage();
  const contact = useContact();
  const openCookies = useConsentStore((s) => s.openPanel);

  return (
    <footer className="border-t border-line bg-panel-2/60">
      <div className="mx-auto max-w-7xl px-4 pt-14 pb-24 sm:px-6 sm:pb-14 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="mb-3 flex items-center gap-2">
              <BrandMark className="shadow-none" />
              <span className="font-heading text-lg font-extrabold text-ink">
                {t("brand_name")}
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted">{t("footer_about")}</p>
            {contact.socials.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {contact.socials.map((s) => {
                  const Icon = SOCIAL_ICON[s.key];
                  return (
                    <a
                      key={s.key}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-line p-2 text-muted transition-colors hover:border-brand hover:text-brand"
                      aria-label={s.label}
                    >
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-ink">{t("footer_links")}</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link to="/" className="transition-colors hover:text-brand">
                  {t("nav_home")}
                </Link>
              </li>
              <li>
                <Link to="/shop" className="transition-colors hover:text-brand">
                  {t("nav_shop")}
                </Link>
              </li>
              <li>
                <Link to="/politique" className="transition-colors hover:text-brand">
                  {t("legal_nav_policy")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-ink">{t("footer_legal")}</h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link to="/mentions-legales" className="transition-colors hover:text-brand">
                  {t("legal_nav_mentions")}
                </Link>
              </li>
              <li>
                <Link to="/cgv" className="transition-colors hover:text-brand">
                  {t("legal_nav_cgv")}
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="transition-colors hover:text-brand">
                  {t("legal_nav_privacy")}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="transition-colors hover:text-brand">
                  {t("legal_nav_cookies")}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openCookies}
                  className="text-start transition-colors hover:text-brand"
                >
                  {t("cookie_manage")}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-ink">{t("footer_contact")}</h3>
            <ul className="space-y-2.5 text-sm text-muted">
              <li>
                <a
                  href={contact.phoneHref}
                  className="flex items-center gap-2 transition-colors hover:text-brand"
                >
                  <Phone size={14} className="shrink-0 text-brand" />
                  <bdi dir="ltr">{contact.phone}</bdi>
                </a>
              </li>
              <li>
                <a
                  href={contact.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 transition-colors hover:text-brand"
                >
                  <MessageCircle size={14} className="shrink-0 text-accent" />
                  WhatsApp
                </a>
              </li>
              {contact.email && (
                <li>
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 transition-colors hover:text-brand"
                  >
                    <Mail size={14} className="shrink-0 text-brand" />
                    <bdi dir="ltr" className="[overflow-wrap:anywhere]">
                      {contact.email}
                    </bdi>
                  </a>
                </li>
              )}
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-brand" />
                <span>{contact.address ?? t("footer_country")}</span>
              </li>
              {contact.hours && (
                <li className="flex items-start gap-2">
                  <Clock size={14} className="mt-0.5 shrink-0 text-brand" />
                  <span>{contact.hours}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 border-t border-line pt-6 text-xs text-muted sm:grid sm:grid-cols-3">
          <p className="sm:justify-self-start">
            © {new Date().getFullYear()} {t("brand_name")}. {t("footer_rights")}
          </p>
          <a
            href="https://alaayounsi.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-brand sm:col-span-2 sm:justify-self-end"
          >
            {t("footer_credit")}
          </a>
        </div>
      </div>
    </footer>
  );
}
