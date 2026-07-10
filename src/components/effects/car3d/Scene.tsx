import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor, Sparkles } from "@react-three/drei";
import type { MotionValue } from "framer-motion";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { CameraIntro } from "./CameraIntro";
import { CameraRig } from "./CameraRig";
import { ExhaustTrails } from "./ExhaustTrails";
import { HeroCarGLB } from "./HeroCarGLB";
import { ParallaxGroup } from "./ParallaxGroup";
import { Road } from "./Road";
import { StudioEnvironment } from "./StudioEnvironment";
import { Underglow } from "./Underglow";
import { CAMERA_POSITION, CAMERA_TARGET, INTRO_SESSION_KEY } from "./constants";

interface SceneProps {
  animate: boolean;
  fogColor: string;
  lowQuality: boolean;
  onQualityChange: (low: boolean) => void;
  sideOffset: number;
  scrollProgress: MotionValue<number> | null;
  paintColor: string;
  parallaxEnabled: boolean;
  sparkle: boolean;
}

function SpeedLines({
  active,
  count,
  speedRef,
}: {
  active: boolean;
  count: number;
  speedRef: RefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const lines = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        side: i % 2 === 0 ? 1 : -1,
        offsetZ: (i / count) * 30 - 10,
        y: 0.4 + Math.random() * 0.6,
        x: 3.1 + Math.random() * 0.8,
      })),
    [count]
  );

  useFrame((_, delta) => {
    if (!active || !group.current) return;
    const speed = speedRef.current ?? 1;
    group.current.children.forEach((child) => {
      child.position.z += delta * 9 * speed;
      if (child.position.z > 10) child.position.z = -14;
    });
  });

  return (
    <group ref={group}>
      {lines.map((l, i) => (
        <mesh key={i} position={[l.side * l.x, l.y, l.offsetZ]}>
          <boxGeometry args={[0.03, 0.03, 1.4]} />
          <meshStandardMaterial
            color="#bcd6ff"
            emissive="#bcd6ff"
            emissiveIntensity={1.2}
            transparent
            opacity={0.55}
          />
        </mesh>
      ))}
    </group>
  );
}

// OrbitControls' azimuth/polar limits are absolute spherical angles, not
// offsets from wherever the camera happens to start — derive them from the
// actual camera position so "look around a bit" is centered on the shot
// we composed, however CAMERA_POSITION is tuned later.
const INITIAL_AZIMUTH = Math.atan2(CAMERA_POSITION[0], CAMERA_POSITION[2]);
const CAMERA_RADIUS_XZ = Math.hypot(CAMERA_POSITION[0], CAMERA_POSITION[2]);
const INITIAL_POLAR = Math.atan2(CAMERA_RADIUS_XZ, CAMERA_POSITION[1]);

export function Scene({
  animate,
  fogColor,
  lowQuality,
  onQualityChange,
  sideOffset,
  scrollProgress,
  paintColor,
  parallaxEnabled,
  sparkle,
}: SceneProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [interacting, setInteracting] = useState(false);
  const [introDone, setIntroDone] = useState(
    () => !animate || sessionStorage.getItem(INTRO_SESSION_KEY) === "1"
  );
  const speedRef = useRef(1);

  // Single source of truth for how fast everything in the scene moves: wheel
  // spin, road scroll, speed lines, and exhaust trails all read this ref
  // instead of each deriving their own number.
  useFrame(() => {
    const scrollBoost = 1 + (scrollProgress?.get() ?? 0) * 1.6;
    speedRef.current = (interacting ? 0.4 : 1) * scrollBoost;
  });

  function handleIntroComplete() {
    sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    setIntroDone(true);
  }

  return (
    <>
      <PerformanceMonitor
        onDecline={() => onQualityChange(true)}
        onIncline={() => onQualityChange(false)}
      />

      <color attach="background" args={[fogColor]} />
      {!lowQuality && <StudioEnvironment />}

      {!introDone && <CameraIntro active={!introDone} onComplete={handleIntroComplete} />}
      <CameraRig sideOffset={sideOffset} scrollProgress={scrollProgress} />

      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#dbe8ff", "#1a1d24", 0.6]} />
      <directionalLight
        position={[4, 6, -3]}
        intensity={2.2}
        castShadow={!lowQuality}
        shadow-mapSize={lowQuality ? [512, 512] : [1024, 1024]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[-5, 3, 4]} intensity={0.6} color="#6094ff" />
      <pointLight position={[0, 1.8, -2.5]} intensity={0.5} color="#15a059" distance={7} />

      <ParallaxGroup enabled={parallaxEnabled && introDone}>
        <HeroCarGLB
          spinning={animate}
          speedRef={speedRef}
          lowQuality={lowQuality}
          paintColor={paintColor}
          instantPaint={!animate}
        />
        <Road moving={animate} speedRef={speedRef} fogColor={fogColor} lowQuality={lowQuality} />
        {!lowQuality && <Underglow active={animate} />}
        {!lowQuality && <ExhaustTrails speedRef={speedRef} active={animate} />}
      </ParallaxGroup>
      {!lowQuality && <SpeedLines active={animate} count={10} speedRef={speedRef} />}
      {sparkle && (
        <Sparkles
          count={40}
          scale={[3, 1.4, 8]}
          position={[0, 0.8, -4.5]}
          size={1.6}
          speed={0.3}
          opacity={0.35}
          color="#cfe0ff"
        />
      )}

      <OrbitControls
        ref={controlsRef}
        target={CAMERA_TARGET}
        enabled={introDone}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={INITIAL_POLAR - 0.25}
        maxPolarAngle={INITIAL_POLAR + 0.2}
        minAzimuthAngle={INITIAL_AZIMUTH - 0.6}
        maxAzimuthAngle={INITIAL_AZIMUTH + 0.6}
        autoRotate={animate && introDone}
        autoRotateSpeed={0.6}
        enableDamping
        dampingFactor={0.08}
        onStart={() => setInteracting(true)}
        onEnd={() => setInteracting(false)}
      />
    </>
  );
}
