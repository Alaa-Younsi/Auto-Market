import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";

function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  // Asphalt base with subtle grain
  ctx.fillStyle = "#20242c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const shade = Math.random() * 18;
    ctx.fillStyle = `rgba(${shade + 20}, ${shade + 24}, ${shade + 30}, 0.5)`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // Edge lines
  ctx.fillStyle = "#e7ecf5";
  ctx.fillRect(canvas.width * 0.08, 0, 6, canvas.height);
  ctx.fillRect(canvas.width * 0.92 - 6, 0, 6, canvas.height);

  // Center dashed line
  const dashLength = 70;
  const gapLength = 55;
  let y = 0;
  ctx.fillStyle = "#dfe8ff";
  while (y < canvas.height) {
    ctx.fillRect(canvas.width / 2 - 5, y, 10, dashLength);
    y += dashLength + gapLength;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 14);
  texture.anisotropy = 4;
  return texture;
}

interface RoadProps {
  moving: boolean;
  speedRef: RefObject<number>;
  fogColor: string;
  lowQuality: boolean;
}

export function Road({ moving, speedRef, fogColor, lowQuality }: RoadProps) {
  const texture = useMemo(() => createRoadTexture(), []);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (moving) {
      texture.offset.y += delta * (speedRef.current ?? 1) * 0.55;
    }
  });

  return (
    <>
      <fog attach="fog" args={[fogColor, 8, 26]} />
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[9, 60]} />
        {lowQuality ? (
          <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
        ) : (
          // extends MeshStandardMaterial, so `map` still drives the lane
          // markings while the surface itself gains a real reflection.
          <MeshReflectorMaterial
            map={texture}
            blur={[300, 60]}
            resolution={512}
            mixBlur={0.9}
            mixStrength={2.2}
            depthScale={0.5}
            minDepthThreshold={0.85}
            maxDepthThreshold={1}
            roughness={0.85}
            metalness={0.1}
            mirror={0.35}
          />
        )}
      </mesh>
      {/* Soft shoulder strips */}
      {[1, -1].map((side) => (
        <mesh
          key={side}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[side * 5.2, -0.005, 0]}
          receiveShadow
        >
          <planeGeometry args={[2, 60]} />
          <meshStandardMaterial color={fogColor} roughness={1} metalness={0} />
        </mesh>
      ))}
    </>
  );
}
