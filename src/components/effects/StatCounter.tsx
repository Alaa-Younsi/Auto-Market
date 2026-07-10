import { useRef } from "react";
import { useInView } from "framer-motion";
import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { useMediaFlags } from "@/hooks/useMediaFlags";

interface StatCounterProps {
  value: number;
  label: string;
  suffix?: string;
  decimals?: number;
}

/**
 * Dashboard-gauge style stat: the number sweeps up to its value the first time
 * it scrolls into view, the way a needle settles.
 */
export function StatCounter({ value, label, suffix = "", decimals = 0 }: StatCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const { prefersReducedMotion } = useMediaFlags();

  const display = useAnimatedNumber(inView ? value : 0, {
    duration: 1.4,
    enabled: inView && !prefersReducedMotion,
  });

  return (
    <div ref={ref}>
      <span className="mb-2 block h-0.5 w-8 rounded-full bg-gradient-to-r from-brand to-accent" />
      <p className="font-heading text-xl font-extrabold tabular-nums text-ink sm:text-2xl">
        {display.toFixed(decimals)}
        {suffix}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
