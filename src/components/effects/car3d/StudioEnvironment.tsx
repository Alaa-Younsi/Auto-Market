import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";

/**
 * Procedural studio reflection environment (no network fetch) so the
 * clearcoat car paint reads as glossy/colored instead of flat black in
 * unlit areas — a physically-based metallic material needs *some*
 * environment map to reflect, direct lights alone aren't enough.
 */
export function StudioEnvironment() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    return () => {
      scene.environment = null;
      envTexture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}
