import { useRef } from "react";
import { useInView } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Telltale {
  icon: LucideIcon;
  title: string;
  desc: string;
  /** Lamp colour, as on a real cluster: green = go, amber = attention, blue = info. */
  tone: "green" | "blue" | "amber" | "cyan";
}

const TONE: Record<Telltale["tone"], string> = {
  green: "text-accent [--lamp:var(--c-green)]",
  blue: "text-brand-light [--lamp:var(--c-brand)]",
  amber: "text-amber-400 [--lamp:251_191_36]",
  cyan: "text-cyan-400 [--lamp:34_211_238]",
};

/**
 * The trust promises as dashboard warning lights. At rest every lamp is lit
 * (the default state is the good state); when the strip first scrolls into
 * view they run the ignition self-test — a bright flash, one after another,
 * then settle — which is purely a bonus on top of an already-lit panel.
 */
export function TelltaleStrip({ items }: { items: Telltale[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-b from-panel to-panel-2/70 shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]"
    >
      {/* the cluster's visor shadow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent"
      />
      <ul className="grid grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <li
            key={item.title}
            className={cn(
              "relative flex flex-col items-start gap-2.5 p-4 sm:flex-row sm:items-center sm:gap-3.5 sm:p-5",
              // hairlines between lamps: vertical on the row, horizontal between rows on phones
              i % 2 === 1 && "border-s border-line/70",
              i >= 2 && "border-t border-line/70 lg:border-t-0",
              i === 2 && "lg:border-s"
            )}
          >
            <span
              className={cn(
                "fx-telltale relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-current/25 bg-[rgb(var(--lamp)/0.1)]",
                TONE[item.tone],
                inView && "is-testing"
              )}
              style={{ animationDelay: `${i * 160}ms` }}
            >
              <item.icon size={20} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">{item.title}</p>
              <p className="text-xs leading-snug text-muted">{item.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
