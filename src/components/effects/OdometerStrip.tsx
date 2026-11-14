import type { CSSProperties } from "react";

export interface OdometerReading {
  /** Tiny instrument tag in the corner, e.g. "ODO". */
  tag: string;
  /** The readout itself. Digits roll on drums; everything else is printed. */
  value: string;
  label: string;
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * One digit window of a mechanical odometer: a drum of 0–9 parked on the
 * value. The roll-in is a CSS animation that only has a `from` keyframe, so
 * the element's resting transform IS the final value — if the animation never
 * runs (reduced motion, a stalled frame) the right number is already showing.
 */
function Drum({ digit, delay }: { digit: number; delay: number }) {
  return (
    <span className="relative inline-block h-[1em] w-[0.62em] overflow-hidden">
      <span
        className="fx-odo-drum absolute inset-x-0 top-0 flex flex-col"
        style={
          {
            // The drum is two turns (20 digits) tall, so one digit = 5% of its height.
            transform: `translateY(-${digit * 5}%)`,
            "--odo-from": `${-(digit + 10) * 5}%`,
            animationDelay: `${delay}ms`,
          } as CSSProperties
        }
      >
        {[...DIGITS, ...DIGITS].map((d, i) => (
          <span key={i} className="block h-[1em] text-center leading-none">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

function Readout({ value, baseDelay }: { value: string; baseDelay: number }) {
  return (
    // The drums hold 0–9 twice over; screen readers get the real value instead.
    <span dir="ltr" className="inline-flex items-end leading-none" role="img" aria-label={value}>
      {[...value].map((ch, i) => {
        if (/\d/.test(ch)) return <Drum key={i} digit={Number(ch)} delay={baseDelay + i * 110} />;
        if (ch === " ") return <span key={i} className="w-[0.25em]" />;
        // Units (DA, h) print smaller and dimmer than the readout, like a gauge legend.
        const isUnit = /\p{L}/u.test(ch);
        return (
          <span
            key={i}
            className={isUnit ? "pb-[0.08em] text-[0.55em] text-[#9fb0c8]" : "px-[0.04em]"}
          >
            {ch}
          </span>
        );
      })}
    </span>
  );
}

/**
 * The hero's facts, set as an instrument-cluster display: one dark LCD bar,
 * split into readouts, each with its tag lamp and rolling digits. Only facts
 * the shop can stand behind go here — no invented customer counts or ratings.
 */
export function OdometerStrip({ readings }: { readings: OdometerReading[] }) {
  return (
    <div className="fx-lcd relative overflow-hidden rounded-2xl border border-line bg-[rgb(4_8_16)] p-1.5 shadow-[inset_0_2px_12px_rgb(0_0_0/0.6)]">
      <div className="grid grid-cols-3 divide-x divide-white/10 rtl:divide-x-reverse">
        {readings.map((r, i) => (
          <div key={r.tag} className="relative min-w-0 px-3 py-3 sm:px-4">
            <span className="mb-2 flex items-center gap-1.5 font-heading text-[10px] font-bold uppercase tracking-[0.18em] text-brand-light [html[lang=ar]_&]:tracking-normal">
              <span className="fx-lamp h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              {r.tag}
            </span>
            <p className="font-heading text-xl font-extrabold tabular-nums text-[#e8f1ff] [text-shadow:0_0_14px_rgb(var(--c-brand)/0.55)] sm:text-2xl">
              <Readout value={r.value} baseDelay={350 + i * 180} />
            </p>
            <p className="mt-1.5 truncate text-[11px] text-[#9fb0c8] sm:text-xs">{r.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
