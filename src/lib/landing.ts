/**
 * Product landing pages (/lp/:slug) — one sales page per product for ad
 * traffic. The page holds COPY only; price, stock, options and offers stay on
 * the product, and the order is priced by place_order like any other.
 */

export type LandingStatus = "draft" | "published";

export interface LandingBenefit {
  title_fr: string;
  title_ar: string;
  text_fr: string;
  text_ar: string;
}

export interface LandingFaq {
  q_fr: string;
  q_ar: string;
  a_fr: string;
  a_ar: string;
}

export const LANDING_SECTION_KEYS = [
  "countdown",
  "gallery",
  "benefits",
  "story",
  "specs",
  "offers",
  "order",
  "reviews",
  "faq",
] as const;
export type LandingSectionKey = (typeof LANDING_SECTION_KEYS)[number];

export interface LandingSection {
  key: LandingSectionKey;
  visible: boolean;
}

export interface ProductLanding {
  id: string;
  slug: string;
  product_id: string;
  status: LandingStatus;
  headline_fr: string | null;
  headline_ar: string | null;
  sub_fr: string | null;
  sub_ar: string | null;
  cta_fr: string | null;
  cta_ar: string | null;
  urgency_fr: string | null;
  urgency_ar: string | null;
  story_title_fr: string | null;
  story_title_ar: string | null;
  story_fr: string | null;
  story_ar: string | null;
  hero_image_url: string | null;
  story_image_url: string | null;
  benefits: LandingBenefit[];
  faq: LandingFaq[];
  sections: LandingSection[];
  countdown_hours: number | null;
  created_at: string;
  updated_at: string;
}

export type ProductLandingInput = Omit<ProductLanding, "id" | "created_at" | "updated_at">;

export const LANDING_COLUMNS =
  "id,slug,product_id,status,headline_fr,headline_ar,sub_fr,sub_ar,cta_fr,cta_ar,urgency_fr,urgency_ar,story_title_fr,story_title_ar,story_fr,story_ar,hero_image_url,story_image_url,benefits,faq,sections,countdown_hours,created_at,updated_at";

/**
 * Saved order wins; unknown keys are dropped; sections shipped later are
 * appended as visible, so an old page never silently loses a new block.
 */
export function mergeSections(saved: unknown): LandingSection[] {
  const out: LandingSection[] = [];
  const seen = new Set<string>();
  if (Array.isArray(saved)) {
    for (const s of saved) {
      if (typeof s !== "object" || s === null) continue;
      const key = (s as { key?: unknown }).key;
      if (typeof key !== "string" || seen.has(key)) continue;
      if (!(LANDING_SECTION_KEYS as readonly string[]).includes(key)) continue;
      seen.add(key);
      out.push({
        key: key as LandingSectionKey,
        visible: (s as { visible?: unknown }).visible !== false,
      });
    }
  }
  for (const key of LANDING_SECTION_KEYS) if (!seen.has(key)) out.push({ key, visible: true });
  return out;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

function parseList<T>(raw: unknown, keys: (keyof T)[]): T[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => Object.fromEntries(keys.map((k) => [k, str(x[k as string])])) as T);
}

export function normalizeLanding(raw: Record<string, unknown>): ProductLanding {
  const s = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : null);
  return {
    id: String(raw.id),
    slug: String(raw.slug),
    product_id: String(raw.product_id),
    status: raw.status === "published" ? "published" : "draft",
    headline_fr: s("headline_fr"),
    headline_ar: s("headline_ar"),
    sub_fr: s("sub_fr"),
    sub_ar: s("sub_ar"),
    cta_fr: s("cta_fr"),
    cta_ar: s("cta_ar"),
    urgency_fr: s("urgency_fr"),
    urgency_ar: s("urgency_ar"),
    story_title_fr: s("story_title_fr"),
    story_title_ar: s("story_title_ar"),
    story_fr: s("story_fr"),
    story_ar: s("story_ar"),
    hero_image_url: s("hero_image_url"),
    story_image_url: s("story_image_url"),
    benefits: parseList<LandingBenefit>(raw.benefits, [
      "title_fr",
      "title_ar",
      "text_fr",
      "text_ar",
    ]),
    faq: parseList<LandingFaq>(raw.faq, ["q_fr", "q_ar", "a_fr", "a_ar"]),
    sections: mergeSections(raw.sections),
    countdown_hours: typeof raw.countdown_hours === "number" ? raw.countdown_hours : null,
    created_at: String(raw.created_at ?? ""),
    updated_at: String(raw.updated_at ?? ""),
  };
}

/** Per field: reader's language → French → fallback. */
export function pickText(
  lang: "fr" | "ar",
  fr: string | null | undefined,
  ar: string | null | undefined,
  fallback = ""
): string {
  const a = (lang === "ar" ? ar : fr)?.trim();
  if (a) return a;
  const f = fr?.trim();
  return f || fallback;
}
