import { useLanguage } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n/translations";

// Plain hex values, no three.js import — PaintChips renders in the eager
// HeroScene tree, so it must not drag the lazy 3D chunk into the main bundle.
export const PAINT_SWATCHES: { hex: string; labelKey: TranslationKey }[] = [
  { hex: "#2160eb", labelKey: "hero_paint_blue" },
  { hex: "#15a059", labelKey: "hero_paint_green" },
  { hex: "#2a2f3a", labelKey: "hero_paint_graphite" },
];

interface PaintChipsProps {
  value: string;
  onChange: (hex: string) => void;
  className?: string;
}

export function PaintChips({ value, onChange, className }: PaintChipsProps) {
  const { t } = useLanguage();

  return (
    <div className={cn("flex gap-2", className)}>
      {PAINT_SWATCHES.map((swatch) => (
        <button
          key={swatch.hex}
          type="button"
          onClick={() => onChange(swatch.hex)}
          aria-label={t(swatch.labelKey)}
          aria-pressed={value === swatch.hex}
          className={cn(
            "h-7 w-7 rounded-full border-2 shadow-card transition-transform",
            value === swatch.hex
              ? "scale-110 border-ink ring-2 ring-brand ring-offset-2 ring-offset-bg"
              : "border-white/70 hover:scale-105"
          )}
          style={{ backgroundColor: swatch.hex }}
        />
      ))}
    </div>
  );
}
