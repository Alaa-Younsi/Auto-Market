import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "accent" | "muted" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand/10 text-brand border-brand/20",
  accent: "bg-accent/10 text-accent border-accent/20",
  muted: "bg-panel-2 text-muted border-line",
  danger: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function Badge({ tone = "brand", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "fx-pop inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
