import type { ReactNode } from "react";

interface PlateBadgeProps {
  children: ReactNode;
  className?: string;
}

/**
 * The hero's eyebrow, drawn as a number plate: a pale plate with a dark
 * embossed rim, two screws, and the blue country band on the start edge.
 * A single glint crosses it once on load (transform-only, so with motion off
 * the plate is simply there).
 */
export function PlateBadge({ children, className }: PlateBadgeProps) {
  return (
    <span
      className={`fx-plate relative inline-flex items-stretch overflow-hidden rounded-[7px] border-2 border-[#1b2333] bg-[#f3f2ec] shadow-[0_6px_18px_-8px_rgb(0_0_0/0.6),inset_0_0_0_1px_rgb(255_255_255/0.6)] ${className ?? ""}`}
    >
      <span className="flex flex-col items-center justify-center gap-0.5 bg-brand-dark px-1.5 text-white">
        <span className="font-heading text-[10px] font-black leading-none">DZ</span>
        <span className="h-1.5 w-1.5 rounded-full border border-white/70" aria-hidden="true" />
      </span>
      <span className="relative flex items-center gap-2 whitespace-nowrap px-2.5 py-1.5 font-heading text-[10px] font-extrabold uppercase leading-none tracking-[0.07em] text-[#111827] sm:gap-2.5 sm:px-3 sm:text-xs sm:tracking-[0.12em] [html[lang=ar]_&]:tracking-normal">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#9aa1ad] shadow-[inset_0_1px_1px_rgb(0_0_0/0.45)]"
        />
        {children}
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#9aa1ad] shadow-[inset_0_1px_1px_rgb(0_0_0/0.45)]"
        />
      </span>
    </span>
  );
}
