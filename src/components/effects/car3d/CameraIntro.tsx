import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CAMERA_POSITION, CAMERA_TARGET, INTRO_CONTROL, INTRO_DURATION, INTRO_START } from "./constants";

interface CameraIntroProps {
  active: boolean;
  onComplete: () => void;
}

/**
 * One-shot cinematic fly-in: a low sweeping approach that lands exactly on
 * CAMERA_POSITION, so OrbitControls (disabled until `onComplete`) picks up
 * with zero jump — its spherical state is derived from wherever the camera
 * physically is when it takes over.
 */
export function CameraIntro({ active, onComplete }: CameraIntroProps) {
  const camera = useThree((state) => state.camera);
  const t = useRef(0);
  const done = useRef(false);

  const curve = useMemo(
    () => new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...INTRO_START),
      new THREE.Vector3(...INTRO_CONTROL),
      new THREE.Vector3(...CAMERA_POSITION)
    ),
    []
  );

  useFrame((_, delta) => {
    if (!active || done.current) return;

    t.current += delta / INTRO_DURATION;
    if (t.current >= 1) {
      camera.position.set(...CAMERA_POSITION);
      camera.lookAt(...CAMERA_TARGET);
      done.current = true;
      onComplete();
      return;
    }

    // Cubic ease-out: fast start, gentle settle.
    const eased = 1 - (1 - t.current) ** 3;
    curve.getPoint(eased, camera.position);
    camera.lookAt(...CAMERA_TARGET);
  });

  return null;
}
