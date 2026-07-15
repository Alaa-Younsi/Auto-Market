import { useState } from "react";

function detectWebgl(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

// Detection is a cheap synchronous canvas call, so it runs as a lazy initial
// state instead of a useEffect — computing it post-mount left a one-frame gap
// where `webglSupported` was falsy, flashing the 2D fallback art on every load
// before flipping to the 3D scene.
export function useWebglSupport(): boolean {
  const [supported] = useState<boolean>(detectWebgl);
  return supported;
}
