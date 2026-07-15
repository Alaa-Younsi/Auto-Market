import { lazy, Suspense, useEffect, useRef, useState } from "react";
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
  const webglSupport = useWebglSupport();
  const { isCompact, saveData } = useMediaFlags();
  const [paintColor, setPaintColor] = useState<string>(PAINT_SWATCHES[0].hex);
  const containerRef = useRef<HTMLDivElement>(null);
  // Scrolled well past the hero, the canvas would otherwise keep rendering
  // every frame off-screen — pure wasted GPU/CPU that competes with scroll
  // compositing site-wide. Default true so the intro plays immediately.
  const [isNearViewport, setIsNearViewport] = useState(true);

  // The 3D scene is ~270 KB of JS plus the model. On Data Saver or a 2G-class
  // connection that is the whole page budget, so those visitors get the 2D art.
  const webglSupported = webglSupport && !saveData;

  // Start the GLB download in parallel with the 3D chunk, but only on the page
  // that actually renders it and only when WebGL is there to use it.
  useEffect(() => {
    if (!webglSupported) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.type = "model/gltf-binary";
    link.crossOrigin = "anonymous";
    link.href = "/models/hero-car.glb";
    document.head.appendChild(link);
    return () => link.remove();
  }, [webglSupported]);

  useEffect(() => {
    if (!webglSupported) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsNearViewport(entry.isIntersecting),
      { rootMargin: "200px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [webglSupported]);

  return (
    <div ref={containerRef} className="relative h-full w-full">
      {webglSupported ? (
        <SceneErrorBoundary fallback={<HeroArtFallback />}>
          {/* Fallback is deliberately empty: flashing the 2D art for the
              second the 3D chunk takes to load reads as a glitch. The 2D car
              only appears when WebGL is unavailable or the scene crashes. */}
          <Suspense fallback={null}>
            <HeroCar3D
              sideOffset={sideOffset}
              scrollProgress={scrollProgress}
              paintColor={paintColor}
              active={isNearViewport}
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
