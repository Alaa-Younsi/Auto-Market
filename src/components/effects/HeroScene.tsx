import { lazy, Suspense, useState } from "react";
import type { MotionValue } from "framer-motion";
import { HeroArt } from "./HeroArt";
import { HeroBadges } from "./HeroBadges";
import { PaintChips, PAINT_SWATCHES } from "./PaintChips";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import { useWebglSupport } from "@/hooks/useWebglSupport";
import { useMediaFlags } from "@/hooks/useMediaFlags";

const HeroCar3D = lazy(() =>
  import("./HeroCar3D").then((mod) => ({ default: mod.HeroCar3D }))
);

interface HeroSceneProps {
  sideOffset: number;
  scrollProgress: MotionValue<number> | null;
}

/** HeroArt is drawn for a square frame; keep it one in the full-bleed hero. */
function HeroArtFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="aspect-square w-full max-w-[520px]">
        <HeroArt />
      </div>
    </div>
  );
}

export function HeroScene({ sideOffset, scrollProgress }: HeroSceneProps) {
  const webglSupported = useWebglSupport();
  const { isCompact } = useMediaFlags();
  const [paintColor, setPaintColor] = useState<string>(PAINT_SWATCHES[0].hex);

  return (
    <div className="relative h-full w-full">
      {webglSupported ? (
        <SceneErrorBoundary fallback={<HeroArtFallback />}>
          <Suspense fallback={<HeroArtFallback />}>
            <HeroCar3D
              sideOffset={sideOffset}
              scrollProgress={scrollProgress}
              paintColor={paintColor}
            />
          </Suspense>
        </SceneErrorBoundary>
      ) : (
        <HeroArtFallback />
      )}
      <HeroBadges />
      {webglSupported && !isCompact && (
        <PaintChips
          value={paintColor}
          onChange={setPaintColor}
          className="pointer-events-auto absolute bottom-4 end-4 z-10 hidden lg:flex"
        />
      )}
    </div>
  );
}
