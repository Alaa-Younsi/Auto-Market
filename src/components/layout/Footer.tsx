import { Link } from "react-router-dom";
import { MapPin, Phone } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageProvider";
import { RoadDivider } from "@/components/effects/RoadDivider";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/ui/SocialIcons";
import { BrandMark } from "@/components/ui/BrandMark";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-line bg-panel-2/60">
      <div className="pt-6">
        <RoadDivider />
      </div>
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Link to="/" className="mb-3 flex items-center gap-2">
              <BrandMark className="shadow-none" />
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
                href="https://www.instagram.com/automarket.shop_/"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-line p-2 text-muted transition-colors hover:border-brand hover:text-brand"
                aria-label="Instagram"
              >
                <InstagramIcon size={16} />
              </a>
              <a
                href="https://www.tiktok.com/@automarket.shop_"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-line p-2 text-muted transition-colors hover:border-brand hover:text-brand"
                aria-label="TikTok"
              >
                <TikTokIcon size={16} />
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
                <MapPin size={14} className="text-brand" /> Algérie
              </li>
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
            className="transition-colors hover:text-brand sm:justify-self-center"
          >
            {t("footer_credit")}
          </a>
          <Link to="/admin/login" className="transition-colors hover:text-brand sm:justify-self-end">
            {t("footer_admin")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
