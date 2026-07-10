import { cn } from "@/lib/utils";

// Static class strings — Tailwind's scanner can't see values built at runtime.
const STREAKS = [
  "top-[18%] w-40 [animation-delay:0s]",
  "top-[34%] w-64 [animation-delay:1.1s]",
  "top-[52%] w-28 [animation-delay:0.4s]",
  "top-[68%] w-52 [animation-delay:1.7s]",
  "top-[84%] w-36 [animation-delay:0.8s]",
];

/**
 * Motion-blur streaks rushing past, for otherwise-empty pages. Purely
 * decorative, so the global reduced-motion rule stilling them is the right
 * outcome rather than something to work around.
 */
export function SpeedStreaks({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {STREAKS.map((streak) => (
        <span
          key={streak}
          className={cn(
            "fx-streak absolute h-px rounded-full bg-gradient-to-r from-transparent via-brand/50 to-transparent",
            streak
          )}
        />
      ))}
    </div>
  );
}
