/**
 * Store-wide promotions — TypeScript mirror of `apply_promotions()` in
 * migration 0013. The SQL function is the ONLY figure ever charged; this mirror
 * exists so a quantity stepper updates instantly, and `price_cart` replaces it
 * the moment the server answers (see useCartQuote).
 *
 * Resolution order (identical, word for word, in the migration header):
 *   1. Packs consume cart quantities first, highest priority first.
 *   2. Whatever quantity is LEFT on a line takes the single BEST of: the
 *      product's own quantity offers, and every eligible promotion.
 *   3. Discounts never stack on the same unit. Rounded once, at the end, to
 *      2 dp half-away-from-zero, and clamped to the subtotal.
 *
 * Mirror rules that keep the two engines equal (tested on PGlite):
 *   - integer division truncates (Math.floor here, int `/` in SQL);
 *   - percentages apply to the line base, no intermediate rounding.
 */
import type { QuantityOffer } from "@/types/db";

export type PromotionType = "buy_x_get_y" | "buy_x_percent" | "category_percent" | "pack";
export type PromotionScope = "all" | "categories" | "products";

export interface PackItem {
  product_id: string;
  quantity: number;
}

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  active: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  scope: PromotionScope;
  category_ids: string[];
  product_ids: string[];
  buy_qty: number;
  get_qty: number;
  percent: number;
  pack_items: PackItem[];
  pack_price: number | null;
  label_fr: string | null;
  label_ar: string | null;
  created_at: string;
  updated_at: string;
}

/** Editable columns only — never spread a loaded row into a write (PGRST204). */
export type PromotionInput = Omit<Promotion, "id" | "created_at" | "updated_at">;

export interface QuoteLine {
  product_id: string;
  category_id: string | null;
  unit_price: number;
  quantity: number;
  quantity_offers: QuantityOffer[];
}

export interface CartQuote {
  subtotal: number;
  discount: number;
  lines: { gross: number; discount: number; net: number }[];
}

/** Postgres `round(x, 2)`: half away from zero. */
export function round2(x: number): number {
  const s = Math.sign(x);
  // toPrecision(12) removes binary noise first (2.675 is stored as 2.67499…).
  return (s * Math.round(Number((Math.abs(x) * 100).toPrecision(12)))) / 100;
}

export function isPromotionLive(p: Promotion, now: Date = new Date()): boolean {
  if (!p.active) return false;
  if (p.starts_at && new Date(p.starts_at) > now) return false;
  if (p.ends_at && new Date(p.ends_at) <= now) return false;
  return true;
}

function eligible(p: Promotion, line: { product_id: string; category_id: string | null }) {
  if (p.scope === "all") return true;
  if (p.scope === "products") return p.product_ids.includes(line.product_id);
  return line.category_id !== null && p.category_ids.includes(line.category_id);
}

/** Same ordering as the SQL: priority desc, then created_at, then id. */
function byPriority(a: Promotion, b: Promotion) {
  if (a.priority !== b.priority) return b.priority - a.priority;
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Best price for `qty` units of one line, before packs are considered. */
function bestPrice(
  unit: number,
  qty: number,
  offers: QuantityOffer[],
  promos: Promotion[],
  line: { product_id: string; category_id: string | null }
): number {
  const base = unit * qty;
  let best = base;
  const consider = (c: number | null) => {
    if (c !== null && c < best) best = c;
  };

  for (const o of offers) {
    if (o.type === "free" && o.buy > 0 && o.get > 0) {
      consider((qty - Math.floor(qty / (o.buy + o.get)) * o.get) * unit);
    } else if (o.type === "price" && o.qty > 1 && o.price >= 0 && qty >= o.qty) {
      consider(Math.floor(qty / o.qty) * o.price + (qty % o.qty) * unit);
    }
  }

  for (const p of promos) {
    if (p.type === "pack" || !eligible(p, line)) continue;
    if (p.type === "buy_x_get_y" && p.buy_qty > 0 && p.get_qty > 0) {
      consider((qty - Math.floor(qty / (p.buy_qty + p.get_qty)) * p.get_qty) * unit);
    } else if (
      p.type === "buy_x_percent" &&
      p.buy_qty > 0 &&
      qty >= p.buy_qty &&
      p.percent > 0 &&
      p.percent < 100
    ) {
      consider((base * (100 - p.percent)) / 100);
    } else if (p.type === "category_percent" && p.percent > 0 && p.percent < 100) {
      consider((base * (100 - p.percent)) / 100);
    }
  }
  return best;
}

export function quoteCart(
  lines: QuoteLine[],
  promotions: Promotion[],
  now: Date = new Date()
): CartQuote {
  const live = promotions.filter((p) => isPromotionLive(p, now)).sort(byPriority);
  const remaining = lines.map((l) => l.quantity);
  const lineDiscount = lines.map(() => 0);
  const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);

  // 1. Packs first.
  for (const pack of live) {
    if (pack.type !== "pack" || pack.pack_price === null || pack.pack_price < 0) continue;
    // Sum duplicate product rows, exactly like the SQL `group by`.
    const need = new Map<string, number>();
    for (const it of pack.pack_items) {
      if (it.quantity > 0) need.set(it.product_id, (need.get(it.product_id) ?? 0) + it.quantity);
    }
    if (need.size === 0) continue;

    let times = Number.POSITIVE_INFINITY;
    for (const [pid, q] of need) {
      const avail = lines.reduce((s, l, i) => (l.product_id === pid ? s + remaining[i] : s), 0);
      times = Math.min(times, Math.floor(avail / q));
    }
    if (!(times > 0)) continue;

    const consumed = lines.map(() => 0);
    for (const [pid, q] of need) {
      let left = q * times;
      lines.forEach((l, i) => {
        if (left <= 0 || l.product_id !== pid) return;
        const take = Math.min(remaining[i], left);
        remaining[i] -= take;
        left -= take;
        consumed[i] += take * l.unit_price;
      });
    }
    const packGross = consumed.reduce((s, c) => s + c, 0);
    const discount = Math.max(0, packGross - pack.pack_price * times);
    if (packGross > 0 && discount > 0) {
      consumed.forEach((c, i) => {
        lineDiscount[i] += (discount * c) / packGross;
      });
    }
  }

  // 2. What is left on each line takes its single best rule.
  lines.forEach((l, i) => {
    const qty = remaining[i];
    if (qty <= 0) return;
    lineDiscount[i] +=
      l.unit_price * qty - bestPrice(l.unit_price, qty, l.quantity_offers, live, l);
  });

  // 3. Round once, clamp.
  const discount = Math.min(round2(lineDiscount.reduce((s, d) => s + d, 0)), round2(subtotal));
  return {
    subtotal: round2(subtotal),
    discount,
    lines: lines.map((l, i) => {
      const gross = round2(l.unit_price * l.quantity);
      const d = Math.min(round2(lineDiscount[i]), gross);
      return { gross, discount: d, net: round2(gross - d) };
    }),
  };
}

/** Live store promotions that can apply to this product (packs included). */
export function promotionsForProduct(
  product: { id: string; category_id: string | null },
  promotions: Promotion[],
  now: Date = new Date()
): Promotion[] {
  return promotions
    .filter((p) => isPromotionLive(p, now))
    .filter((p) =>
      p.type === "pack"
        ? p.pack_items.some((it) => it.product_id === product.id)
        : eligible(p, { product_id: product.id, category_id: product.category_id })
    )
    .sort(byPriority);
}

const LTR = (s: string) => `⁦${s}⁩`;

/**
 * The text the customer reads. The admin's own label wins; otherwise one is
 * generated from the rule. A label is only a label — money comes from the engine.
 */
export function promotionLabel(
  p: Pick<
    Promotion,
    "type" | "buy_qty" | "get_qty" | "percent" | "pack_price" | "label_fr" | "label_ar"
  >,
  lang: "fr" | "ar",
  formatPrice: (n: number) => string
): string {
  const own = (lang === "ar" ? p.label_ar : p.label_fr)?.trim() || p.label_fr?.trim();
  if (own) return own;
  const pct = LTR(`-${Number(p.percent)}%`);
  switch (p.type) {
    case "buy_x_get_y":
      return lang === "ar"
        ? `اشترِ ${p.buy_qty} واحصل على ${p.get_qty} مجانًا`
        : `Achetez ${p.buy_qty}, ${p.get_qty} offert${p.get_qty > 1 ? "s" : ""}`;
    case "buy_x_percent":
      return lang === "ar"
        ? `${pct} ابتداءً من ${p.buy_qty} قطع`
        : `${pct} dès ${p.buy_qty} article${p.buy_qty > 1 ? "s" : ""}`;
    case "category_percent":
      return lang === "ar" ? `تخفيض ${pct}` : `Promo ${pct}`;
    case "pack":
      return lang === "ar"
        ? `باقة بـ ${LTR(formatPrice(Number(p.pack_price ?? 0)))}`
        : `Pack à ${LTR(formatPrice(Number(p.pack_price ?? 0)))}`;
  }
}

/** Parse a row defensively — numeric columns arrive as strings from PostgREST. */
export function normalizePromotion(raw: Record<string, unknown>): Promotion {
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? 0 : Number(v));
  const packItems = Array.isArray(raw.pack_items) ? raw.pack_items : [];
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    type: raw.type as PromotionType,
    active: raw.active === true,
    priority: num(raw.priority),
    starts_at: (raw.starts_at as string | null) ?? null,
    ends_at: (raw.ends_at as string | null) ?? null,
    scope: (raw.scope as PromotionScope) ?? "all",
    category_ids: Array.isArray(raw.category_ids) ? (raw.category_ids as string[]) : [],
    product_ids: Array.isArray(raw.product_ids) ? (raw.product_ids as string[]) : [],
    buy_qty: num(raw.buy_qty),
    get_qty: num(raw.get_qty),
    percent: num(raw.percent),
    pack_items: packItems
      .filter((it): it is Record<string, unknown> => typeof it === "object" && it !== null)
      .map((it) => ({ product_id: String(it.product_id), quantity: num(it.quantity) })),
    pack_price:
      raw.pack_price === null || raw.pack_price === undefined ? null : num(raw.pack_price),
    label_fr: (raw.label_fr as string | null) ?? null,
    label_ar: (raw.label_ar as string | null) ?? null,
    created_at: String(raw.created_at ?? ""),
    updated_at: String(raw.updated_at ?? ""),
  };
}
