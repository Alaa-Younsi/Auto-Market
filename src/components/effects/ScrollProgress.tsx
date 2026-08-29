import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { MiniCar } from "./MiniCar";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";

/**
 * Dashboard gauge for the page: a brand bar that fills as you drive down the
 * document, with a small car riding its leading edge. Rendered at the bottom
 * edge of the sticky header.
 *
 * It sits on a full-width TRACK so a partly-filled bar always reads as
 * progress, never as a border that stopped rendering half-way — the previous
 * version had no track and a green (accent) fill, so mid-scroll it looked like
 * a broken line. The fill stays in the brand-blue family; green is this
 * system's CTA/"success" colour and misreads on a gauge.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const { prefersReducedMotion } = useMediaFlags();
  const { dir } = useLanguage();
  const [scrollable, setScrollable] = useState(false);

  // On a page shorter than the viewport there is no scroll range, and
  // scrollYProgress reports a permanent 1 — a full bar on an unscrolled page.
  useEffect(() => {
    const measure = () =>
      setScrollable(document.documentElement.scrollHeight > window.innerHeight + 4);

    measure();
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);

    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  // The spring is what makes it feel like a needle rather than a value readout.
  const smoothed = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  });

  const progress = prefersReducedMotion ? scrollYProgress : smoothed;
  const carX = useTransform(progress, [0, 1], dir === "rtl" ? ["0vw", "-100vw"] : ["0vw", "100vw"]);
  // Fade the car in after the drive has actually started so it isn't parked on
  // the edge of an unscrolled page.
  const carOpacity = useTransform(progress, [0, 0.02, 0.98, 1], [0, 1, 1, 0]);

  if (!scrollable) return null;

  return (
    <>
      {/* Full-width track — makes the bar a continuous line at any fill level. */}
      <div aria-hidden="true" className="absolute inset-x-0 -bottom-px h-[3px] bg-line/70" />
      {/* Fill. `origin-*` must be physical per side; in RTL the leading edge is
          the right, so scale from there. */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress }}
        className="absolute inset-x-0 -bottom-px h-[3px] origin-left rounded-e-full bg-gradient-to-r from-brand to-brand-light shadow-[0_0_10px_-1px_rgb(var(--c-brand)/0.7)] rtl:origin-right rtl:rounded-e-none rtl:rounded-s-full"
      />
      {/* The MiniCar's wheels sit at the very bottom of its SVG box, so pinning
          the box's bottom just above the bar lands the wheels on the line. */}
      <motion.div
        aria-hidden="true"
        style={{ x: carX, opacity: carOpacity }}
        className="absolute bottom-px start-0 z-10 hidden md:block"
      >
        <MiniCar size={18} className="text-brand drop-shadow-[0_0_5px_rgb(var(--c-brand)/0.75)]" />
      </motion.div>
    </>
  );
}
