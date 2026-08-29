import { useLanguage } from "@/i18n/LanguageProvider";
import { useSeo } from "@/hooks/useSeo";
import { SpeedStreaks } from "@/components/effects/SpeedStreaks";
import { MiniCar } from "@/components/effects/MiniCar";
import { LinkButton } from "@/components/ui/LinkButton";

export default function NotFound() {
  const { t } = useLanguage();

  useSeo({ title: `404 — ${t("brand_name")}` });

  return (
    <div className="relative overflow-hidden">
      <SpeedStreaks />
      <div className="relative mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <p className="fx-gradient-text font-heading text-7xl font-black sm:text-8xl">404</p>
        <h1 className="mt-4 font-heading text-xl font-extrabold text-ink">
          {t("not_found_title")}
        </h1>
        <p className="mt-2 text-sm text-muted">{t("not_found_message")}</p>
        <LinkButton to="/" className="mt-6">
          {t("not_found_back")}
        </LinkButton>
      </div>

      <div aria-hidden="true" className="relative h-10 w-full overflow-hidden">
        <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-line" />
        <div className="fx-road-dash absolute top-1/2 h-px w-full -translate-y-1/2" />
        <div className="fx-mini-car top-1.5 text-muted" style={{ animationDelay: "-11s" }}>
          <span className="fx-mini-bob block">
            <span className="fx-mini-streak" />
            <span className="fx-mini-glow" />
            <MiniCar size={48} />
          </span>
        </div>
      </div>
    </div>
  );
}
