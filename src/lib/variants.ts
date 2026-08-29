import type { ProductVariantGroup, ProductVariantValue, SelectedVariant } from "@/types/db";

/**
 * `products.variants` is jsonb with no schema. A group's `values` used to be a
 * plain `string[]`; each entry can now be `{ value, image_url? }`. Normalise
 * either shape so every consumer (storefront + admin) can trust the object
 * form, and drop malformed entries rather than crashing a render.
 */
export function normalizeVariantValues(raw: unknown): ProductVariantValue[] {
  if (!Array.isArray(raw)) return [];
  const out: ProductVariantValue[] = [];
  for (const entry of raw) {
    if (typeof entry === "string") {
      if (entry.trim()) out.push({ value: entry, image_url: null });
    } else if (entry && typeof entry === "object") {
      const rec = entry as Record<string, unknown>;
      const value = typeof rec.value === "string" ? rec.value : "";
      if (!value.trim()) continue;
      out.push({
        value,
        image_url: typeof rec.image_url === "string" && rec.image_url ? rec.image_url : null,
      });
    }
  }
  return out;
}

export function normalizeVariantGroups(raw: unknown): ProductVariantGroup[] {
  if (!Array.isArray(raw)) return [];
  const out: ProductVariantGroup[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const name_fr = typeof rec.name_fr === "string" ? rec.name_fr : "";
    const name_ar = typeof rec.name_ar === "string" ? rec.name_ar : name_fr;
    const values = normalizeVariantValues(rec.values);
    if (!name_fr.trim() || values.length === 0) continue;
    out.push({ name_fr, name_ar, values });
  }
  return out;
}

/** The shopper's picks, keyed by group `name_fr` → chosen value string. */
export function selectedVariantsFromChoices(
  groups: ProductVariantGroup[],
  choices: Record<string, string>
): SelectedVariant[] {
  return groups
    .filter((group) => choices[group.name_fr])
    .map((group) => ({
      name_fr: group.name_fr,
      name_ar: group.name_ar,
      value: choices[group.name_fr],
    }));
}
