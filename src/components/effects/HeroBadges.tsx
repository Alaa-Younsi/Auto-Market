import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";

/**
 * Floating stat chips over the hero scene. They sit on the `end` side, which is
 * the half of the frame the car occupies (and mirrors correctly in RTL). Hidden
 * below `lg`, where the scene collapses to a short strip with no room to spare.
 */
export function HeroBadges() {
  const { t } = useLanguage();
  const { enableHeavyEffects } = useMediaFlags();

  return (
    <>
      <motion.div
        className="pointer-events-none absolute end-[6%] top-16 z-20 hidden rounded-2xl border border-line bg-panel/90 px-4 py-2.5 shadow-card backdrop-blur lg:block"
        animate={enableHeavyEffects ? { y: [0, -10, 0] } : undefined}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
      >
        <p className="fx-gradient-text font-heading text-xl font-extrabold">58</p>
        <p className="text-xs text-muted">{t("hero_stat_wilayas")}</p>
      </motion.div>

      <motion.div
        className="pointer-events-none absolute bottom-24 end-[14%] z-20 hidden rounded-2xl border border-line bg-panel/90 px-4 py-2.5 shadow-card backdrop-blur lg:block"
        animate={enableHeavyEffects ? { y: [0, 10, 0] } : undefined}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      >
        <div className="flex items-center gap-1.5">
          <span className="fx-pulse-dot inline-block h-2 w-2 rounded-full bg-accent" />
          <p className="text-xs font-semibold text-ink">{t("trust_cod")}</p>
        </div>
      </motion.div>
    </>
  );
}
