import { useEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const MAX_YAW = 0.035;
const MAX_PITCH = 0.018;
const DAMP = 4;

interface ParallaxGroupProps {
  enabled: boolean;
  children: ReactNode;
}

/**
 * Eases the wrapped group toward the pointer position (desktop only). Rotates
 * a parent group rather than the camera, so it composes cleanly with
 * OrbitControls' autoRotate instead of fighting it.
 */
export function ParallaxGroup({ enabled, children }: ParallaxGroupProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    const onPointerMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [enabled]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const targetYaw = enabled ? pointer.current.x * MAX_YAW : 0;
    const targetPitch = enabled ? pointer.current.y * MAX_PITCH : 0;

    groupRef.current.rotation.y = THREE.MathUtils.damp(
      groupRef.current.rotation.y,
      targetYaw,
      DAMP,
      delta
    );
    groupRef.current.rotation.x = THREE.MathUtils.damp(
      groupRef.current.rotation.x,
      targetPitch,
      DAMP,
      delta
    );
  });

  return <group ref={groupRef}>{children}</group>;
}
