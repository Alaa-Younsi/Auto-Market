import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";

const MAJORS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
/** Where the red zone starts, as a fraction of the scale. */
const REDLINE = 6.5 / 8;

/**
 * Section break drawn as a tachometer scale: minor ticks every 200 rpm, major
 * ticks and numerals every 1000, a red zone from 6500, and a needle that
 * revs up as the divider travels through the viewport. With motion off the
 * needle simply rests at 5000 rpm.
 */
export function RevDivider() {
  const { dir } = useLanguage();
  const { prefersReducedMotion } = useMediaFlags();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const eased = useSpring(scrollYProgress, { stiffness: 120, damping: 22, mass: 0.4 });
  const rev = useTransform(eased, [0.1, 0.75], [0.04, 0.93], { clamp: true });
  const fill = prefersReducedMotion ? 0.62 : rev;
  const needlePos = useTransform(rev, (v) => `${v * 100}%`);
  const side = dir === "rtl" ? "right" : "left";

  return (
    <div ref={ref} aria-hidden="true" className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="relative h-11">
        {/* minor ticks */}
        <div className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(to_right,rgb(var(--c-muted)/0.45)_0_1px,transparent_1px_2.5%)]" />
        {/* red zone */}
        <div
          className="absolute top-0 h-3 bg-gradient-to-r from-red-500/0 via-red-500/70 to-red-500 rtl:bg-gradient-to-l"
          style={{ [side]: `${REDLINE * 100}%`, width: `${(1 - REDLINE) * 100}%` }}
        />
        {/* majors + numerals */}
        {MAJORS.map((n) => (
          <div
            key={n}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center rtl:translate-x-1/2"
            style={{ [side]: `${(n / 8) * 100}%` }}
          >
            <span
              className={`h-3.5 w-0.5 rounded-full ${n / 8 >= REDLINE ? "bg-red-500" : "bg-muted"}`}
            />
            <span
              className={`mt-1 font-heading text-[10px] font-bold tabular-nums ${n / 8 >= REDLINE ? "text-red-500" : "text-muted"}`}
            >
              {n}
            </span>
          </div>
        ))}
        {/* baseline + live fill */}
        <div className="absolute inset-x-0 top-[13px] h-px bg-line" />
        <motion.div
          className="absolute inset-x-0 top-[12px] h-[3px] rounded-full bg-gradient-to-r from-brand/30 via-brand to-brand-light shadow-[0_0_10px_rgb(var(--c-brand)/0.7)] rtl:bg-gradient-to-l"
          style={{ scaleX: fill, transformOrigin: side }}
        />
        {!prefersReducedMotion && (
          <motion.div
            className="absolute top-[-3px] h-5 w-[3px] -translate-x-1/2 rounded-full bg-white shadow-[0_0_10px_2px_rgb(var(--c-brand-light)/0.9)] rtl:translate-x-1/2"
            style={{ [side]: needlePos }}
          />
        )}
        <span
          dir="ltr"
          className="absolute end-0 top-8 font-heading text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/80"
        >
          ×1000 rpm
        </span>
      </div>
    </div>
  );
}
