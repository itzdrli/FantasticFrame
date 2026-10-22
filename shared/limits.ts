/**
 * Size limits for the single-image render API (the fallback used when the
 * browser's WASM renderer fails). Everything is buffered in RAM, and takumi's
 * Rust core only decodes JPEG/PNG/WebP/GIF, so these caps turn an oversized
 * request into a clear error instead of an OOM.
 *
 * Browser-side export has no server limits — it never leaves the device.
 */
export const MAX_RENDER_BODY_BYTES = 35 * 1024 * 1024; // single-image POST (base64 of a 25MB photo)
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024; // one photo, approx binary bytes
/** Decoded size of the uploaded photo (a 25MB PNG can still be gigapixels) */
export const MAX_PHOTO_PIXELS = 80_000_000;
/** Size of the rendered canvas, photo + padding + footer */
export const MAX_OUTPUT_PIXELS = 120_000_000;

/** Approximate binary bytes of a base64 data URL (slight over-estimate). */
export const estimateBase64Bytes = (dataUrl: string): number => {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.ceil((b64.length * 3) / 4);
};
