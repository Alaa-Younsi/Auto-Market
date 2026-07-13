import { cn } from "@/lib/utils";

/* The mark's left stroke is white, so it sits on a dark tile to stay
   visible in light mode — same tile the favicons use. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "fx-logo-spin flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0a1120] shadow-glow",
        className
      )}
    >
      <img src="/logo.png" alt="" className="h-[68%] w-[68%] object-contain" />
    </span>
  );
}
