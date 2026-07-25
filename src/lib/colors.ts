import type { ProductColor } from "@/types/db";

/** A DB row saved before the color-image migration ran still carries `colors`
    as plain strings — normalize either shape into ProductColor objects so
    every consumer (storefront and admin) can trust the object shape. */
export function normalizeColors(raw: unknown): ProductColor[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) =>
    typeof entry === "string"
      ? { label_fr: entry, label_ar: entry, hex: "#a3a3a3", image_url: null }
      : (entry as ProductColor)
  );
}
