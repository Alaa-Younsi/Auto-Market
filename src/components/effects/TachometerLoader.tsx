import { cn } from "@/lib/utils";

interface TachometerLoaderProps {
  className?: string;
  label?: string;
  size?: "sm" | "md";
}

const SIZE_CLASSES: Record<NonNullable<TachometerLoaderProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-10 w-10",
};

/**
 * Rev-counter spinner: a static gauge track with a brand-coloured needle arc
 * sweeping round it. Used wherever the site is waiting on data.
 */
export function TachometerLoader({ className, label, size = "md" }: TachometerLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)} role="status">
      <svg viewBox="0 0 50 50" className={SIZE_CLASSES[size]} aria-hidden="true">
        {/* gauge track */}
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth={size === "sm" ? "4" : "3"}
          className="stroke-line"
        />
        {/* redline arc */}
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth={size === "sm" ? "4" : "3"}
          strokeLinecap="round"
          strokeDasharray="24 102"
          className="origin-center animate-spin stroke-accent/70"
        />
        {/* needle */}
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth={size === "sm" ? "4" : "3"}
          strokeLinecap="round"
          strokeDasharray="8 118"
          className="origin-center animate-spin-slow stroke-brand"
        />
        <circle cx="25" cy="25" r="2.5" className="fill-brand" />
      </svg>
      {label ? <p className="text-xs text-muted">{label}</p> : null}
      <span className="sr-only">{label ?? "Loading"}</span>
    </div>
  );
}
