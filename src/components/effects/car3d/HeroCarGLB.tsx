import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  BRAND_BLUE,
  BRAND_GREEN,
  GLASS_MATERIAL,
  GROUND_OFFSET,
  HEADLIGHT_MATERIAL,
  HEADLIGHT_X,
  HEADLIGHT_Y,
  HEADLIGHT_Z,
  MODEL_URL,
  PAINT_MATERIAL,
  TAILLIGHT_MATERIAL,
  TRIM_MATERIAL,
  TYRE_MATERIAL,
  WHEEL_NODES,
  WHEEL_SPIN_RATE,
} from "./constants";

useGLTF.preload(MODEL_URL);

interface HeroCarGLBProps {
  spinning: boolean;
  speedRef: RefObject<number>;
  lowQuality: boolean;
  paintColor: string;
  instantPaint: boolean;
}

/** Soft radial falloff used by the additive headlight sprites. */
function createGlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(0.25, "rgba(207, 224, 255, 0.75)");
  gradient.addColorStop(1, "rgba(207, 224, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function buildMaterials() {
  return {
    [PAINT_MATERIAL]: new THREE.MeshPhysicalMaterial({
      color: BRAND_BLUE,
      metalness: 0.5,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.1,
    }),
    [GLASS_MATERIAL]: new THREE.MeshPhysicalMaterial({
      color: "#0d1b33",
      metalness: 0.1,
      roughness: 0.12,
      transparent: true,
      opacity: 0.82,
      envMapIntensity: 1.4,
    }),
    [TRIM_MATERIAL]: new THREE.MeshStandardMaterial({
      color: "#aab4c4",
      roughness: 0.28,
      metalness: 0.85,
      envMapIntensity: 1.1,
    }),
    [HEADLIGHT_MATERIAL]: new THREE.MeshStandardMaterial({
      color: "#eaf2ff",
      emissive: "#bcd6ff",
      emissiveIntensity: 1.4,
      roughness: 0.2,
    }),
    [TAILLIGHT_MATERIAL]: new THREE.MeshStandardMaterial({
      color: BRAND_GREEN,
      emissive: BRAND_GREEN,
      emissiveIntensity: 1.3,
      roughness: 0.3,
    }),
    [TYRE_MATERIAL]: new THREE.MeshStandardMaterial({
      color: "#15171c",
      roughness: 0.78,
      metalness: 0.05,
    }),
  };
}

export function HeroCarGLB({
  spinning,
  speedRef,
  lowQuality,
  paintColor,
  instantPaint,
}: HeroCarGLBProps) {
  const { scene } = useGLTF(MODEL_URL);
  const invalidate = useThree((state) => state.invalidate);
  const groupRef = useRef<THREE.Group>(null);
  const spinRef = useRef(0);
  const glowRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.SpotLight>(null);
  const targetPaint = useRef(new THREE.Color(paintColor));

  const glowTexture = useMemo(() => createGlowTexture(), []);

  // The spotlight needs a target that lives in the scene graph; creating it up
  // front means it exists on the very first render, before any ref is attached.
  const spotTarget = useMemo(() => new THREE.Object3D(), []);

  // Clone so the recolour never touches useGLTF's shared cache entry — a second
  // mount (or another page reusing the model) would otherwise inherit our
  // materials and, on unmount, our disposals.
  const { car, materials } = useMemo(() => {
    const clone = scene.clone(true);
    const mats = buildMaterials();

    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = true;
      object.receiveShadow = true;

      const current = object.material;
      const swap = (material: THREE.Material): THREE.Material =>
        mats[material.name] ?? material;

      object.material = Array.isArray(current)
        ? current.map(swap)
        : swap(current);
    });

    return { car: clone, materials: mats };
  }, [scene]);

  const wheels = useMemo(
    () =>
      WHEEL_NODES.map((name) => car.getObjectByName(name)).filter(
        (node): node is THREE.Object3D => node !== undefined
      ),
    [car]
  );

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
      glowTexture.dispose();
    },
    [materials, glowTexture]
  );

  // A demand frameloop only renders when something calls invalidate(), so a
  // colour change made while idle (reduced motion, or between autoRotate
  // frames) needs an explicit nudge or it would sit un-rendered.
  useEffect(() => {
    targetPaint.current.set(paintColor);
    if (instantPaint) {
      materials[PAINT_MATERIAL].color.copy(targetPaint.current);
    }
    invalidate();
  }, [paintColor, instantPaint, materials, invalidate]);

  useFrame((state, delta) => {
    const speed = speedRef.current ?? 1;

    if (spinning) {
      // Wheels spin about their local +X. The GLB is rotated 180deg about Y, so
      // in the car's own frame it still travels forward along +Z, and rolling
      // without slip means a positive angular velocity about that axis.
      spinRef.current += delta * speed * WHEEL_SPIN_RATE;
      for (const wheel of wheels) wheel.rotation.x = spinRef.current;
    }

    if (!instantPaint) {
      materials[PAINT_MATERIAL].color.lerp(targetPaint.current, 1 - Math.pow(0.0001, delta));
    }

    if (groupRef.current) {
      const bob = Math.sin(state.clock.elapsedTime * 1.2) * 0.012;
      groupRef.current.position.y = GROUND_OFFSET + bob;
    }

    if (spinning) {
      const pulse = 0.85 + Math.sin(state.clock.elapsedTime * 2.4) * 0.15;
      if (glowRef.current) {
        for (const sprite of glowRef.current.children) {
          if (sprite instanceof THREE.Sprite) sprite.material.opacity = pulse;
        }
      }
      if (lightRef.current) lightRef.current.intensity = pulse * 9;
    }
  });

  return (
    <group ref={groupRef} position={[0, GROUND_OFFSET, 0]}>
      {/* Ships facing +Z; turn it around so the headlights face the camera. */}
      <primitive object={car} rotation={[0, Math.PI, 0]} />

      <group ref={glowRef}>
        {[1, -1].map((side) => (
          <sprite
            key={side}
            position={[side * HEADLIGHT_X, HEADLIGHT_Y, HEADLIGHT_Z - 0.04]}
            scale={[0.62, 0.34, 1]}
          >
            <spriteMaterial
              map={glowTexture}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              transparent
              opacity={0.85}
            />
          </sprite>
        ))}
      </group>

      <primitive object={spotTarget} position={[0, 0, -9]} />
      {!lowQuality && (
        <spotLight
          ref={lightRef}
          position={[0, HEADLIGHT_Y, HEADLIGHT_Z]}
          target={spotTarget}
          color="#cfe0ff"
          intensity={9}
          angle={0.55}
          penumbra={0.85}
          distance={16}
          decay={1.4}
        />
      )}
    </group>
  );
}
