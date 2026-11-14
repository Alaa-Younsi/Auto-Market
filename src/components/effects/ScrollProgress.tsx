import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { useMediaFlags } from "@/hooks/useMediaFlags";

/**
 * Dashboard gauge for the page: a brand bar that fills as you drive down the
 * document. Rendered at the bottom edge of the sticky header.
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
    </>
  );
}
