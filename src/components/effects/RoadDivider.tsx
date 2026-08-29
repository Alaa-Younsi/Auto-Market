import type { CSSProperties } from "react";
import { MiniCar } from "./MiniCar";

/**
 * Section separator drawn as a stretch of road: a lane with moving centre
 * markings and three cars driving across it in parallax lanes — the near lane
 * is bigger, brighter and faster, the far lane small and dim. Each car has a
 * suspension bob, a headlight bloom and a speed smear. Pure CSS, so the global
 * prefers-reduced-motion rule in index.css stills all of it.
 */
const LANES: { size: number; style: CSSProperties; tint: string }[] = [
  {
    size: 48,
    style: { top: "1px", animationDuration: "7s", animationDelay: "0s" },
    tint: "text-muted",
  },
  {
    size: 34,
    style: { top: "7px", animationDuration: "9.5s", animationDelay: "-3.2s", opacity: 0.72 },
    tint: "text-muted",
  },
  {
    size: 24,
    style: { top: "11px", animationDuration: "13s", animationDelay: "-7.5s", opacity: 0.5 },
    tint: "text-muted",
  },
];

export function RoadDivider() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto h-9 w-full max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8"
    >
      <span className="fx-road-strip" />

      {LANES.map((lane, i) => (
        <div key={i} className="fx-mini-car" style={lane.style}>
          <span className="fx-mini-bob block">
            <span className="fx-mini-streak" />
            <span className="fx-mini-glow" />
            <MiniCar size={lane.size} className={lane.tint} />
          </span>
        </div>
      ))}
    </div>
  );
}
