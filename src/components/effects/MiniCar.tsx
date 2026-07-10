import { cn } from "@/lib/utils";

interface MiniCarProps {
  size?: number;
  className?: string;
  /**
   * Mirror horizontally in RTL so the car drives nose-first in reading order.
   * Only meaningful for left-right placements — turn off for anything rotated
   * onto a vertical axis (e.g. ScrollRoad), where the flip would read as
   * upside-down rather than "facing the other way".
   */
  mirrorRtl?: boolean;
}

/**
 * Side-view car silhouette used everywhere a small "moving car" reads as a
 * marker: road dividers, the scroll rail, order-status timelines. Body takes
 * `currentColor` so callers tint it with a text-* class.
 */
export function MiniCar({ size = 36, className, mirrorRtl = true }: MiniCarProps) {
  return (
    <svg
      viewBox="0 0 36 14"
      width={size}
      height={(size * 14) / 36}
      className={cn(mirrorRtl && "rtl:-scale-x-100", className)}
      aria-hidden="true"
    >
      <path
        d="M2 11c-1 0-1.5-.5-1.5-1.5S1.5 8 2.5 8h1.2l1.6-3.3C5.9 3.6 6.8 3 7.9 3h9.4c1 0 1.9.5 2.4 1.4L21 7h5.5c1.9 0 3.5 1.1 4.2 2.8l.3.7c.3.7-.2 1.5-1 1.5H29"
        fill="currentColor"
        opacity="0.92"
      />
      <path d="M9 8.5V4.6h7.3c.5 0 .9.25 1.1.7L18.7 8.5H9Z" className="fill-panel" opacity="0.85" />
      <circle cx="9.5" cy="11.5" r="2.3" fill="currentColor" />
      <circle cx="9.5" cy="11.5" r="0.9" className="fill-panel" />
      <circle cx="24.5" cy="11.5" r="2.3" fill="currentColor" />
      <circle cx="24.5" cy="11.5" r="0.9" className="fill-panel" />
      <circle cx="1.4" cy="9.2" r="0.9" fill="#fff" />
      <circle cx="29.8" cy="9.7" r="0.8" className="fill-accent" />
    </svg>
  );
}
