import { formatPrice } from "@/lib/format";

interface PriceProps {
  value: number;
  /** Leading character(s) — e.g. "-" on a discount line — kept inside the
      LTR run so the sign never detaches from the number under RTL. */
  prefix?: string;
  className?: string;
}

/**
 * A formatted price ALWAYS rendered `dir="ltr"`, even inside the Arabic
 * (RTL) layout. `formatPrice()` produces a digit run + a space + the Latin
 * "DA" suffix; under the Unicode Bidi Algorithm in an RTL context those are
 * separate directional runs and the browser visually reorders them, so
 * "4 500 DA" shows as "DA 500 4". Forcing `ltr` on the whole price fixes it.
 * Never call `formatPrice()` directly in JSX — always go through this so no
 * call site can regress.
 */
export function Price({ value, prefix, className }: PriceProps) {
  return (
    <span dir="ltr" className={className}>
      {prefix}
      {formatPrice(value)}
    </span>
  );
}
