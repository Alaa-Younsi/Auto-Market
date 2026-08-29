const MAX_EDGE = 1400;
const QUALITY = 0.82;

/**
 * Downscale + re-encode a picked image to WebP before upload.
 *
 * A phone photo is 3–6 MB of JPEG at 4000px wide; the storefront never shows a
 * product image larger than ~800px. Uploading the original means every shopper
 * downloads it, so the resize happens here, once, at upload time. The
 * responsive-srcset helpers below then shrink what's *sent* per layout slot —
 * both fixes are needed; compression alone still ships a 1400px file to a
 * 350px card.
 *
 * Falls back to the original file if the browser can't encode WebP.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY)
  );
  if (!blob) return file;

  // A photo already smaller than the WebP we just made (e.g. a tuned JPEG):
  // keep whichever is lighter.
  if (blob.size >= file.size) return file;

  const name = `${file.name.replace(/\.[^.]+$/, "")}.webp`;
  return new File([blob], name, { type: "image/webp" });
}

/* ------------------------------------------------------------------ *
 * Delivery-side: responsive srcsets off Supabase's render endpoint.
 *
 * Egress bills on bytes SENT. A 1400px stored file served into a 350px grid
 * card, times every thumbnail on every page view, is what burns the free
 * allowance. Supabase Storage's on-the-fly image transform DOES answer on the
 * free plan (verify with a curl against the project's own bucket); if it ever
 * 404s, SmartImage's onError drops the srcset and falls back to the raw object
 * URL, so images degrade to "full size but visible" rather than breaking.
 * ------------------------------------------------------------------ */
const SUPABASE_PUBLIC_MARKER = "/storage/v1/object/public/";
const SUPABASE_RENDER_MARKER = "/storage/v1/render/image/public/";
const STORAGE_SRCSET_WIDTHS = [200, 400, 600, 900, 1400];
const STORAGE_QUALITY = 70;

export function isSupabaseStorageUrl(src: string): boolean {
  return src.includes(SUPABASE_PUBLIC_MARKER);
}

export function supabaseRenderUrl(src: string, width: number): string {
  const base = src.replace(SUPABASE_PUBLIC_MARKER, SUPABASE_RENDER_MARKER);
  const sep = base.includes("?") ? "&" : "?";
  // resize=contain is NOT optional: with `width` alone the endpoint returns the
  // requested width at the ORIGINAL height — a silently squashed image.
  return `${base}${sep}width=${width}&resize=contain&quality=${STORAGE_QUALITY}`;
}

export function supabaseSrcSet(src: string): string | undefined {
  if (!isSupabaseStorageUrl(src)) return undefined;
  return STORAGE_SRCSET_WIDTHS.map((w) => `${supabaseRenderUrl(src, w)} ${w}w`).join(", ");
}

/** srcset for a Supabase Storage image, or undefined for anything else. */
export function responsiveSrcSet(src: string | null | undefined): string | undefined {
  if (!src) return undefined;
  return supabaseSrcSet(src);
}
