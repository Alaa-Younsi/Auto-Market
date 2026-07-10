import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

interface UseAnimatedNumberOptions {
  duration?: number;
  enabled?: boolean;
}

/**
 * Tweens from the previous value to the next whenever `value` changes (not
 * from zero — a subtotal that resets to 0 on every re-render reads as a bug).
 * `enabled: false` (reduced motion, or a caller-specific gate) snaps instantly.
 */
export function useAnimatedNumber(
  value: number,
  { duration = 0.8, enabled = true }: UseAnimatedNumberOptions = {}
): number {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    if (!enabled) {
      previous.current = value;
      setDisplay(value);
      return;
    }

    const controls = animate(previous.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setDisplay,
    });
    previous.current = value;

    return () => controls.stop();
  }, [value, enabled, duration]);

  return display;
}
