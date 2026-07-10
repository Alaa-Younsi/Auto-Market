import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { MiniCar } from "./MiniCar";
import { useLanguage } from "@/i18n/LanguageProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";

/**
 * Dashboard gauge for the page: a brand-to-accent bar that fills as you drive
 * down the document, with a small car riding its leading edge. Rendered at
 * the bottom edge of the sticky header.
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
  const carX = useTransform(progress, [0, 1], dir === "rtl" ? ["0vw", "-97vw"] : ["0vw", "97vw"]);

  if (!scrollable) return null;

  return (
    <>
      <motion.div
        aria-hidden="true"
        style={{ scaleX: progress }}
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-brand to-accent rtl:origin-right"
      />
      <motion.div
        aria-hidden="true"
        style={{ x: carX }}
        className="absolute bottom-[-4px] start-0 z-10 hidden md:block"
      >
        <MiniCar size={16} className="text-brand drop-shadow-[0_0_4px_rgb(var(--c-brand)/0.6)]" />
      </motion.div>
    </>
  );
}
