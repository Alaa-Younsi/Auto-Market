import { useLanguage } from "@/i18n/LanguageProvider";

interface CalloutProps {
  tag: string;
  text: string;
  /** Tailwind position classes for the whole callout (anchor + line + label). */
  className: string;
  /** Which way the leader line climbs from the anchor to the label. */
  rise: "up" | "down";
  delay: number;
}

/**
 * A car-configurator spec annotation: a pinged anchor point, a leader line that
 * draws itself out (stroke-dashoffset, resting state = fully drawn), and a
 * bracketed HUD label at the end of it.
 */
function Callout({ tag, text, className, rise, delay }: CalloutProps) {
  const path = rise === "up" ? "M2 46 L34 6 L118 6" : "M2 6 L34 46 L118 46";
  const labelY = rise === "up" ? "top-0 -translate-y-1/2" : "bottom-0 translate-y-1/2";

  return (
    <div
      className={`pointer-events-none absolute z-20 hidden h-[52px] w-[120px] lg:block ${className}`}
      aria-hidden="true"
    >
      <span
        className={`absolute start-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_12px_rgb(var(--c-green))] rtl:translate-x-1/2 ${rise === "up" ? "bottom-0 translate-y-1/2" : "top-0 -translate-y-1/2"}`}
      >
        <span className="fx-ping-ring absolute inset-0 rounded-full border border-accent" />
      </span>
      <svg
        viewBox="0 0 120 52"
        className="absolute inset-0 h-full w-full overflow-visible rtl:-scale-x-100"
        fill="none"
      >
        <path
          d={path}
          className="fx-leader stroke-accent/80"
          strokeWidth="1.25"
          style={{ animationDelay: `${delay}ms` }}
        />
      </svg>
      <div
        className={`fx-hud-label absolute start-full ms-2 w-max ${labelY}`}
        style={{ animationDelay: `${delay + 450}ms` }}
      >
        <p className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-accent [html[lang=ar]_&]:tracking-normal">
          {tag}
        </p>
        <p className="mt-0.5 font-heading text-sm font-extrabold text-ink">{text}</p>
      </div>
    </div>
  );
}

/** Two spec annotations floating over the 3D car (desktop only). */
export function SpecCallouts() {
  const { t } = useLanguage();
  return (
    <>
      <Callout
        tag={t("spec_payment_tag")}
        text={t("trust_cod")}
        rise="up"
        delay={900}
        className="end-[30%] top-[22%]"
      />
      <Callout
        tag={t("spec_delivery_tag")}
        text={t("spec_delivery_text")}
        rise="down"
        delay={1300}
        className="bottom-[22%] end-[26%]"
      />
    </>
  );
}
