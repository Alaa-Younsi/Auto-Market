import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { RoadDivider } from "@/components/effects/RoadDivider";
import { FacebookIcon, InstagramIcon } from "@/components/ui/SocialIcons";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-line bg-panel-2/60">
      <div className="pt-6">
        <RoadDivider />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-heading font-extrabold">
                A
              </span>
              <span className="font-heading text-lg font-extrabold text-ink">
                {t("brand_name")}
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              {t("footer_about")}
            </p>
            <div className="mt-4 flex gap-2">
              <a
                href="#"
                className="rounded-full border border-line p-2 text-muted transition-colors hover:border-brand hover:text-brand"
                aria-label="Facebook"
              >
                <FacebookIcon size={16} />
              </a>
              <a
                href="#"
                className="rounded-full border border-line p-2 text-muted transition-colors hover:border-brand hover:text-brand"
                aria-label="Instagram"
              >
                <InstagramIcon size={16} />
              </a>
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-ink">
              {t("footer_links")}
            </h3>
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
                <Link to="/track-order" className="transition-colors hover:text-brand">
                  {t("nav_track_order")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-ink">
              {t("footer_help")}
            </h3>
            <ul className="space-y-2 text-sm text-muted">
              <li>{t("footer_faq")}</li>
              <li>{t("footer_delivery_info")}</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-ink">
              {t("footer_contact")}
            </h3>
            <ul className="space-y-2.5 text-sm text-muted">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-brand" /> +213 555 00 00 00
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-brand" /> contact@automarket.dz
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-brand" /> Algérie
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row">
          <p>
            © {new Date().getFullYear()} {t("brand_name")}. {t("footer_rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
