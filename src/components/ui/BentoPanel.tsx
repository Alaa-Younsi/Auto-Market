import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface BentoPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a rotating conic-gradient ring on hover (desktop only, see .fx-conic-border). */
  glow?: boolean;
}

export function BentoPanel({ className, children, glow = false, ...props }: BentoPanelProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-panel shadow-card",
        glow && "fx-conic-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
