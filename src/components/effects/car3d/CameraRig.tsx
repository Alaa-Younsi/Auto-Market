import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";
import { VIEW_OFFSET_RATIO } from "./constants";

interface CameraRigProps {
  /** 1 pushes the car toward the right of frame, -1 toward the left, 0 centres it. */
  sideOffset: number;
  /** Hero scroll progress, 0 at rest to 1 once the hero has scrolled away. */
  scrollProgress: MotionValue<number> | null;
}

/**
 * Composes the shot around the car without moving the orbit target.
 *
 * Shifting the camera sideways would drag OrbitControls' azimuth with it and
 * fight autoRotate. Offsetting the *projection* instead slides the rendered
 * image across the canvas while the camera keeps orbiting a dead-centre car,
 * which is what lets the hero copy sit in the empty half of the frame.
 */
export function CameraRig({ sideOffset, scrollProgress }: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    if (sideOffset === 0) {
      camera.clearViewOffset();
      invalidate();
      return;
    }

    const { width, height } = size;
    // A positive x samples further right of the virtual frame, which slides the
    // subject left — hence the negation.
    camera.setViewOffset(
      width,
      height,
      -sideOffset * width * VIEW_OFFSET_RATIO,
      0,
      width,
      height
    );
    invalidate();

    return () => {
      camera.clearViewOffset();
    };
  }, [camera, size, sideOffset, invalidate]);

  useFrame(() => {
    if (!scrollProgress || !(camera instanceof THREE.PerspectiveCamera)) return;

    // Dolly with zoom rather than camera.position: OrbitControls derives its
    // spherical state from the position every frame and would eat the change.
    const target = 1 - Math.min(scrollProgress.get(), 1) * 0.12;
    if (Math.abs(camera.zoom - target) < 0.0005) return;

    camera.zoom = THREE.MathUtils.lerp(camera.zoom, target, 0.12);
    camera.updateProjectionMatrix();
  });

  return null;
}
