import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import { Scene } from "./car3d/Scene";
import { CAMERA_FOV, CAMERA_POSITION } from "./car3d/constants";
import { useTheme } from "@/theme/ThemeProvider";
import { useMediaFlags } from "@/hooks/useMediaFlags";

const FOG_COLORS = {
  light: "#e2e7f0",
  dark: "#080d18",
};

interface HeroCar3DProps {
  sideOffset: number;
  scrollProgress: MotionValue<number> | null;
  paintColor: string;
  /** False once the scene has scrolled well out of view — stops the render
      loop entirely so it's not burning GPU/CPU off-screen. */
  active: boolean;
}

export function HeroCar3D({ sideOffset, scrollProgress, paintColor, active }: HeroCar3DProps) {
  const { theme } = useTheme();
  const { isMobile, isCompact, prefersReducedMotion } = useMediaFlags();
  const [lowQuality, setLowQuality] = useState(isMobile);

  const fogColor = FOG_COLORS[theme];
  const animate = !prefersReducedMotion;
  const dprCap: [number, number] = lowQuality ? [1, 1] : [1, 2];
  const frameloop = !active ? "never" : animate ? "always" : "demand";

  // Below `lg` the scene is a full-width strip with no copy overlapping it, so
  // there is no empty half to push the car into — centre it instead.
  const effectiveSideOffset = isCompact ? 0 : sideOffset;

  // Sparkles are all but invisible against the light-theme fog, so they're a
  // dark-theme-only touch, and skipped whenever the road reflector is off.
  const sparkle = !lowQuality && theme === "dark";

  return (
    <Canvas
      shadows={!lowQuality}
      dpr={dprCap}
      camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      frameloop={frameloop}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      {/* No Suspense here on purpose: Canvas re-throws both suspensions and
          errors to the outer tree, so HeroScene's HeroArt fallback covers the
          GLB load instead of a blank canvas flashing in its place. */}
      <Scene
        animate={animate}
        fogColor={fogColor}
        lowQuality={lowQuality}
        onQualityChange={setLowQuality}
        sideOffset={effectiveSideOffset}
        scrollProgress={scrollProgress}
        paintColor={paintColor}
        parallaxEnabled={!isCompact && !prefersReducedMotion}
        sparkle={sparkle}
      />
    </Canvas>
  );
}

export default HeroCar3D;
