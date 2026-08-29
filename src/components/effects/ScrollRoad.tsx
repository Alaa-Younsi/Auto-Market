import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { MiniCar } from "./MiniCar";
import { useMediaFlags } from "@/hooks/useMediaFlags";

/**
 * A vertical road pinned to the page edge, with a car that drives down it as
 * you scroll — your position in the page, read as a drive. Fixed (not
 * absolute-in-flow) so it never fights the full-bleed `overflow-hidden`
 * sections it runs alongside.
 */
export function ScrollRoad() {
  const { enableHeavyEffects, isCompact } = useMediaFlags();
  const { scrollYProgress } = useScroll();
  const railRef = useRef<HTMLDivElement>(null);
  const [railHeight, setRailHeight] = useState(0);

  const smoothed = useSpring(scrollYProgress, { stiffness: 160, damping: 28, restDelta: 0.001 });
  const carY = useTransform(smoothed, (v) => v * railHeight);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    const measure = () => setRailHeight(el.clientHeight);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!enableHeavyEffects || isCompact) return null;

  return (
    <div
      ref={railRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-24 bottom-6 end-4 z-20 hidden w-[3px] lg:block"
    >
      <div
        className="absolute inset-0 rounded-full bg-line/50"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgb(var(--c-ink) / 0.18) 0 10px, transparent 10px 22px)",
        }}
      />
      {/* Filled portion of the rail. Brand-blue, not brand→green: a solid
          neon-green stripe down the page edge at full scroll read as a glitch. */}
      <motion.div
        className="absolute inset-x-0 top-0 origin-top rounded-full bg-gradient-to-b from-brand/90 to-brand-light/80 shadow-[0_0_8px_-1px_rgb(var(--c-brand)/0.6)]"
        style={{ scaleY: smoothed, height: "100%" }}
      />
      <motion.div aria-hidden="true" style={{ y: carY }} className="absolute -start-[11px] top-0">
        <MiniCar
          size={22}
          mirrorRtl={false}
          className="rotate-90 text-brand drop-shadow-[0_0_5px_rgb(var(--c-brand)/0.7)]"
        />
      </motion.div>
    </div>
  );
}
