import { useLocation, useOutlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMediaFlags } from "@/hooks/useMediaFlags";

/**
 * Shifts each route into place instead of cutting to it. `useOutlet` snapshots
 * the current page element so the outgoing route keeps rendering while it
 * animates out under AnimatePresence's `wait` mode.
 */
export function PageTransition() {
  const location = useLocation();
  const outlet = useOutlet();
  const { prefersReducedMotion } = useMediaFlags();

  if (prefersReducedMotion) return <>{outlet}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
