import { useEffect, useState } from "react";

interface MediaFlags {
  isMobile: boolean;
  /** Below Tailwind's `lg`, where the hero collapses to a stacked layout. */
  isCompact: boolean;
  prefersReducedMotion: boolean;
  enableHeavyEffects: boolean;
}

function matchesQuery(query: string): boolean {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

export function useMediaFlags(): MediaFlags {
  // Read matchMedia synchronously on first render (not in an effect) so the
  // correct value is there for the very first paint — otherwise every
  // consumer (ScrollRoad, TiltCard, StaggerText, ...) briefly renders its
  // full-motion variant before the effect below corrects it, which is
  // exactly backwards for a reduced-motion user.
  const [isMobile, setIsMobile] = useState(() => matchesQuery("(max-width: 767px)"));
  const [isCompact, setIsCompact] = useState(() => matchesQuery("(max-width: 1023px)"));
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    matchesQuery("(prefers-reduced-motion: reduce)")
  );

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const compactQuery = window.matchMedia("(max-width: 1023px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updateMobile = () => setIsMobile(mobileQuery.matches);
    const updateCompact = () => setIsCompact(compactQuery.matches);
    const updateMotion = () => setPrefersReducedMotion(motionQuery.matches);

    mobileQuery.addEventListener("change", updateMobile);
    compactQuery.addEventListener("change", updateCompact);
    motionQuery.addEventListener("change", updateMotion);

    return () => {
      mobileQuery.removeEventListener("change", updateMobile);
      compactQuery.removeEventListener("change", updateCompact);
      motionQuery.removeEventListener("change", updateMotion);
    };
  }, []);

  return {
    isMobile,
    isCompact,
    prefersReducedMotion,
    enableHeavyEffects: !isMobile && !prefersReducedMotion,
  };
}
