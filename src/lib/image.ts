const MAX_EDGE = 1400;
const QUALITY = 0.82;

/**
 * Downscale + re-encode a picked image to WebP before upload.
 *
 * A phone photo is 3–6 MB of JPEG at 4000px wide; the storefront never shows a
 * product image larger than ~800px. Uploading the original means every shopper
 * downloads it. Supabase's image transformation endpoint is a paid add-on, so
 * the resize has to happen here, once, at upload time.
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

  const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], name, { type: "image/webp" });
}
