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
  // Mounting the Canvas synchronously creates a WebGL context and parses the
  // GLB on the main thread, which is exactly what made first load feel laggy —
  // it competes with the browser painting and hydrating the rest of the page.
  // Hold it back until the browser is idle (page painted + interactive), then
  // bring the car in. The GLB is already downloading via the preload below, so
  // by the time we mount it's warm in cache and comes up fast.
  const [deferredReady, setDeferredReady] = useState(false);

  // The 3D scene is ~270 KB of JS plus the model. On Data Saver or a 2G-class
  // connection that is the whole page budget, so those visitors get the 2D art.
  const webglSupported = webglSupport && !saveData;

  useEffect(() => {
    if (!webglSupported) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId = 0;
    let timerId = 0;
    if (typeof w.requestIdleCallback === "function") {
      idleId = w.requestIdleCallback(() => setDeferredReady(true), { timeout: 1800 });
    } else {
      // Safari has no requestIdleCallback — a short timeout still lets the
      // first paint land before the canvas work begins.
      timerId = window.setTimeout(() => setDeferredReady(true), 700);
    }
    return () => {
      if (idleId && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      if (timerId) window.clearTimeout(timerId);
    };
  }, [webglSupported]);

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
        // Until the idle deferral fires, render nothing here (not the 2D art):
        // flashing the 2D car for the moment before the 3D scene mounts reads
        // as a glitch. The 2D car only appears when WebGL is unavailable or the
        // scene crashes.
        deferredReady && (
          <SceneErrorBoundary fallback={<HeroArtFallback />}>
            <Suspense fallback={null}>
              <HeroCar3D
                sideOffset={sideOffset}
                scrollProgress={scrollProgress}
                paintColor={paintColor}
                active={isNearViewport}
              />
            </Suspense>
          </SceneErrorBoundary>
        )
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
