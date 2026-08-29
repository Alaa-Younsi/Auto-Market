import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ROAD_SPEED } from "./constants";

const COUNT = 180;
// Rear wheel positions in the car's local space, post 180deg flip.
const EMITTERS: [number, number, number][] = [
  [0.62, 0.14, 1.35],
  [-0.62, 0.14, 1.35],
];

interface ExhaustTrailsProps {
  speedRef: RefObject<number>;
  active: boolean;
}

/**
 * A light trail streaming from the rear wheels — one preallocated Points
 * buffer, zero per-frame allocation. Particles respawn at an emitter and age
 * out; the existing scene fog does the distance fade for free.
 */
export function ExhaustTrails({ speedRef, active }: ExhaustTrailsProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const life = useRef<Float32Array>(new Float32Array(COUNT));

  const { positions, geometry, material } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const emitter = EMITTERS[i % EMITTERS.length];
      pos[i * 3] = emitter[0];
      pos[i * 3 + 1] = emitter[1];
      pos[i * 3 + 2] = emitter[2];
      life.current[i] = Math.random() * 1.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      color: "#78a8ff",
      size: 0.06,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return { positions: pos, geometry: geo, material: mat };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((_, delta) => {
    if (!active || !pointsRef.current) return;

    const speed = speedRef.current ?? 1;
    const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < COUNT; i++) {
      life.current[i] -= delta * (0.8 + speed * 0.6);

      if (life.current[i] <= 0) {
        const emitter = EMITTERS[i % EMITTERS.length];
        positions[i * 3] = emitter[0] + (Math.random() - 0.5) * 0.05;
        positions[i * 3 + 1] = emitter[1];
        positions[i * 3 + 2] = emitter[2];
        life.current[i] = 0.5 + Math.random() * 0.7;
        continue;
      }

      positions[i * 3] += (Math.random() - 0.5) * 0.02 * delta * 30;
      positions[i * 3 + 1] += delta * 0.25;
      positions[i * 3 + 2] += delta * ROAD_SPEED * 2 * speed;
    }

    attr.needsUpdate = true;
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}
