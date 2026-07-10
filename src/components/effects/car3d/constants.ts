// Camera looks at the car's front 3/4. The GLB ships facing +Z, so HeroCarGLB
// rotates it 180deg and the headlights end up at z = -1.72, same as the
// procedural car this replaced — the framing below is inherited from it.
// Scaled out along the same view direction as the old [5.6, 2.3, -6.4] shot, so
// the azimuth/polar limits Scene.tsx derives from it are unchanged and only the
// distance (i.e. how small the car reads) differs.
export const CAMERA_POSITION: [number, number, number] = [8.9, 3.6, -10.3];
export const CAMERA_TARGET: [number, number, number] = [0, 0.55, 0];
export const CAMERA_FOV = 24;

/** Fraction of the viewport width the car is pushed toward the frame edge. */
export const VIEW_OFFSET_RATIO = 0.16;

export const BRAND_BLUE = "#2160eb";
export const BRAND_GREEN = "#15a059";

export const MODEL_URL = "/models/hero-car.glb";

// Material names as authored in hero-car.glb (see hero-car-LICENSE.txt).
export const PAINT_MATERIAL = "White";
export const GLASS_MATERIAL = "Windows";
export const TRIM_MATERIAL = "Grey";
export const HEADLIGHT_MATERIAL = "Headlights";
export const TAILLIGHT_MATERIAL = "TailLights";
export const TYRE_MATERIAL = "Black";

// three.js strips dots from glTF node names ("Cylinder.002" -> "Cylinder002").
// The quantize pass pivots each of these at its axle centre, so rotating the
// node about its local X axis spins the wheel about the axle.
export const WHEEL_NODES: readonly string[] = [
  "SportsCar2_BackWheels_Cylinder002",
  "SportsCar2_FrontLeftWheel_Cylinder017",
  "SportsCar2_FrontRightWheel_Cylinder018",
];

/** Model bbox min y — lifts the tyres onto the road plane at y = 0. */
export const GROUND_OFFSET = 0.0157;

// Headlight emitter anchors, in the car's local space *after* the 180deg Y
// rotation (so the front of the car is at -Z).
export const WHEEL_RADIUS = 0.2805;
export const HEADLIGHT_Y = 0.503;
export const HEADLIGHT_Z = -1.72;
export const HEADLIGHT_X = 0.62;

// Road.tsx scrolls its texture at 0.55 tiles/sec over a 60-unit plane repeated
// 14 times, i.e. 0.55 * (60 / 14) world units/sec. Deriving the wheel spin from
// that keeps the tyres rolling without slip instead of guessing a rate.
export const ROAD_SPEED = 0.55 * (60 / 14);
export const WHEEL_SPIN_RATE = ROAD_SPEED / WHEEL_RADIUS;

// Cinematic opening shot: camera flies in along a bezier curve and hands off
// to OrbitControls exactly at CAMERA_POSITION, so there's no jump when the
// controls take over. Played once per browser session.
export const INTRO_START: [number, number, number] = [3.2, 6.8, -17.5];
export const INTRO_CONTROL: [number, number, number] = [11.5, 5.2, -13.5];
export const INTRO_DURATION = 2.4; // seconds
export const INTRO_SESSION_KEY = "am-hero-intro";
