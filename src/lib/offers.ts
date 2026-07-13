import type { QuantityOffer } from "@/types/db";

/**
 * Client-side mirror of the pricing in the place_order RPC — used only for
 * optimistic totals in the cart/checkout UI. The server recomputes everything.
 */
export function lineTotal(price: number, quantity: number, offers?: QuantityOffer[]): number {
  const unit = Number(price);
  const base = unit * quantity;
  let best = base;

  for (const offer of offers ?? []) {
    let candidate: number | null = null;
    if (offer.type === "free" && offer.buy > 0 && offer.get > 0) {
      const group = offer.buy + offer.get;
      candidate = (quantity - Math.floor(quantity / group) * offer.get) * unit;
    } else if (offer.type === "price" && offer.qty > 1 && offer.price >= 0 && quantity >= offer.qty) {
      candidate = Math.floor(quantity / offer.qty) * offer.price + (quantity % offer.qty) * unit;
    }
    if (candidate !== null && candidate < best) best = candidate;
  }
  return best;
}

export function lineDiscount(price: number, quantity: number, offers?: QuantityOffer[]): number {
  return Number(price) * quantity - lineTotal(price, quantity, offers);
}

/** Human label for an offer badge, e.g. "Achetez 2, 1 offert" / "2 pour 3 000 DA". */
export function offerLabel(offer: QuantityOffer, lang: "fr" | "ar", formatPrice: (n: number) => string): string {
  if (offer.type === "free") {
    return lang === "ar"
      ? `اشترِ ${offer.buy} واحصل على ${offer.get} مجانًا`
      : `Achetez ${offer.buy}, ${offer.get} offert${offer.get > 1 ? "s" : ""}`;
  }
  return lang === "ar"
    ? `${offer.qty} بـ ${formatPrice(offer.price)}`
    : `${offer.qty} pour ${formatPrice(offer.price)}`;
}

/** Parse the jsonb column defensively — admin data could be hand-edited. */
export function sanitizeOffers(raw: unknown): QuantityOffer[] {
  if (!Array.isArray(raw)) return [];
  const out: QuantityOffer[] = [];
  for (const o of raw) {
    if (typeof o !== "object" || o === null) continue;
    const rec = o as Record<string, unknown>;
    if (rec.type === "free") {
      const buy = Number(rec.buy);
      const get = Number(rec.get);
      if (Number.isInteger(buy) && buy > 0 && Number.isInteger(get) && get > 0) {
        out.push({ type: "free", buy, get });
      }
    } else if (rec.type === "price") {
      const qty = Number(rec.qty);
      const price = Number(rec.price);
      if (Number.isInteger(qty) && qty > 1 && Number.isFinite(price) && price >= 0) {
        out.push({ type: "price", qty, price });
      }
    }
  }
  return out;
}
