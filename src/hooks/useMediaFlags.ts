import { useEffect, useState } from "react";

interface MediaFlags {
  isMobile: boolean;
  /** Below Tailwind's `lg`, where the hero collapses to a stacked layout. */
  isCompact: boolean;
  /** `lg` and up. Use to conditionally MOUNT one of a desktop/mobile pair —
      an autoplaying <video> downloads in full even while `hidden`, so
      `hidden lg:block` + `lg:hidden` fetches it twice per product view. */
  isDesktop: boolean;
  prefersReducedMotion: boolean;
  enableHeavyEffects: boolean;
  /** Data Saver on, or a 2G-class connection: skip megabyte-scale extras. */
  saveData: boolean;
}

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

function matchesQuery(query: string): boolean {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}

function detectSaveData(): boolean {
  if (typeof navigator === "undefined") return false;
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection) return false;
  if (connection.saveData) return true;
  return connection.effectiveType === "slow-2g" || connection.effectiveType === "2g";
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
    isDesktop: !isCompact,
    prefersReducedMotion,
    enableHeavyEffects: !isMobile && !prefersReducedMotion,
    saveData: detectSaveData(),
  };
}
