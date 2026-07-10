import { motion } from "framer-motion";
import { MiniCar } from "./MiniCar";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n/translations";

const ORDER = ["pending", "confirmed", "shipped", "delivered"] as const;

const LABEL_KEY: Record<(typeof ORDER)[number], TranslationKey> = {
  pending: "track_status_pending",
  confirmed: "track_status_confirmed",
  shipped: "track_status_shipped",
  delivered: "track_status_delivered",
};

interface RoadTimelineProps {
  status: string;
}

/**
 * Order status as a stretch of road: checkpoints for each stage, a car parked
 * at wherever the order currently is. `cancelled`/unknown statuses have no
 * useful position on this road, so the caller's own status Badge covers them.
 */
export function RoadTimeline({ status }: RoadTimelineProps) {
  const { t } = useLanguage();
  const { prefersReducedMotion } = useMediaFlags();
  const index = ORDER.indexOf(status as (typeof ORDER)[number]);

  if (index === -1) return null;

  const delivered = status === "delivered";

  return (
    <div className="relative mt-5 h-14">
      <div className="fx-road-dash absolute top-6 h-px w-full" />

      {ORDER.map((stage, i) => (
        <div
          key={stage}
          className="absolute top-6 flex flex-col items-center"
          style={{ insetInlineStart: `${(i / 3) * 100}%`, transform: "translate(-50%, -50%)" }}
        >
          <span
            className={cn(
              "relative h-2.5 w-2.5 rounded-full transition-colors",
              i <= index ? "bg-brand shadow-glow" : "bg-line",
              delivered && i === ORDER.length - 1 && "fx-pulse-dot"
            )}
          />
          <span
            className={cn(
              "absolute start-1/2 top-4 -translate-x-1/2 whitespace-nowrap text-[10px]",
              i === index ? "font-semibold text-ink" : "text-muted",
              i !== index && "hidden sm:block"
            )}
          >
            {t(LABEL_KEY[stage])}
          </span>
        </div>
      ))}

      <motion.div
        className="absolute top-6 -translate-y-1/2"
        initial={prefersReducedMotion ? false : { insetInlineStart: "0%" }}
        animate={{ insetInlineStart: `${(index / 3) * 100}%` }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 60, damping: 14 }
        }
        style={{ marginInlineStart: -13 }}
      >
        <MiniCar size={26} className="text-brand drop-shadow-[0_0_5px_rgb(var(--c-brand)/0.5)]" />
      </motion.div>
    </div>
  );
}
