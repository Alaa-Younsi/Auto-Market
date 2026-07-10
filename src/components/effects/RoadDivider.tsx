import { MiniCar } from "./MiniCar";

/**
 * Section separator drawn as a stretch of road: a static rail, a dashed centre
 * line scrolling like lane markings, a headlight glow running its length, and
 * two cars driving across at staggered delays. Pure CSS, so the global
 * prefers-reduced-motion rule in index.css stills all of it.
 */
export function RoadDivider() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto h-4 w-full max-w-7xl overflow-hidden px-4 sm:px-6 lg:px-8"
    >
      <div className="relative h-1.5 overflow-hidden">
        <div className="absolute top-1/2 h-px w-full -translate-y-1/2 bg-line" />
        <div className="fx-road-dash absolute top-1/2 h-px w-full -translate-y-1/2" />
        <div className="fx-road-runner absolute top-1/2 h-1.5 w-16 -translate-y-1/2 rounded-full bg-brand shadow-glow" />
      </div>

      <div className="fx-mini-car top-0 text-muted">
        <span className="absolute -start-1.5 top-1 h-1.5 w-1.5 rounded-full bg-brand/60 blur-[3px]" />
        <MiniCar size={26} />
      </div>
      <div
        className="fx-mini-car top-0.5 scale-75 text-muted/70 opacity-80"
        style={{ animationDelay: "4.1s" }}
      >
        <span className="absolute -start-1.5 top-1 h-1.5 w-1.5 rounded-full bg-brand/60 blur-[3px]" />
        <MiniCar size={26} />
      </div>
    </div>
  );
}
