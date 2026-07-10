import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BRAND_BLUE } from "./constants";

/** Elliptical brand-blue falloff, brightest directly beneath the car. */
function createUnderglowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  const { r, g, b } = new THREE.Color(BRAND_BLUE);
  const rgb = `${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}`;
  gradient.addColorStop(0, `rgba(${rgb}, 0.9)`);
  gradient.addColorStop(0.45, `rgba(${rgb}, 0.32)`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Neon pool of light under the chassis. Additive blending means it only ever
 * brightens what's behind it, so it reads correctly against both the light and
 * dark scene backgrounds without needing a per-theme colour.
 */
export function Underglow({ active }: { active: boolean }) {
  const texture = useMemo(() => createUnderglowTexture(), []);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((state) => {
    if (!active || !materialRef.current) return;
    materialRef.current.opacity =
      0.47 + Math.sin(state.clock.elapsedTime * 1.6) * 0.13;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -0.05]}>
      <planeGeometry args={[3.6, 5.6]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
        opacity={0.47}
      />
    </mesh>
  );
}
