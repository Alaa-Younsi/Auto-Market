import type { PointerEvent, ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useMediaFlags } from "@/hooks/useMediaFlags";

const MAX_TILT_DEGREES = 6;
const SPRING = { stiffness: 260, damping: 24, mass: 0.6 };

interface TiltCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * Tilts toward the pointer, like a car body catching the light as it turns.
 * Falls back to a plain wrapper on touch/reduced-motion, where there is no
 * hover to track and the transform would only fight the scroll.
 */
export function TiltCard({ children, className }: TiltCardProps) {
  const { enableHeavyEffects } = useMediaFlags();

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const rotateX = useSpring(
    useTransform(pointerY, [-0.5, 0.5], [MAX_TILT_DEGREES, -MAX_TILT_DEGREES]),
    SPRING
  );
  const rotateY = useSpring(
    useTransform(pointerX, [-0.5, 0.5], [-MAX_TILT_DEGREES, MAX_TILT_DEGREES]),
    SPRING
  );

  if (!enableHeavyEffects) {
    return <div className={className}>{children}</div>;
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <motion.div
      className={className}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
    >
      {children}
    </motion.div>
  );
}
