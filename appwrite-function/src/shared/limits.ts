/**
 * Shared size limits for the render service — pure constants + helpers used
 * by BOTH the server (enforcement in server/utils/limits.ts) and the client
 * (pre-flight warnings before uploading a batch), so the two sides can never
 * disagree about what is acceptable.
 *
 * Everything render-related is buffered in RAM (base64 input + zip output),
 * and takumi's Rust core only decodes JPEG/PNG/WebP/GIF, so a batch of huge
 * PNGs is the worst case. These caps turn that into a clear error instead of
 * an OOM.
 */
export const MAX_RENDER_BODY_BYTES = 35 * 1024 * 1024; // single-image POST (base64 of a 25MB photo)
export const MAX_BATCH_BODY_BYTES = 256 * 1024 * 1024; // batch POST (hard stream cap)
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024; // one photo, approx binary bytes
export const MAX_TOTAL_PHOTO_BYTES = 200 * 1024 * 1024; // sum of all photos in a batch
export const MAX_BATCH_ITEMS = 50;
export const MAX_JOBS = 2; // concurrent in-memory batch jobs (input + zip each)

/** Approximate binary bytes of a base64 data URL (slight over-estimate). */
export const estimateBase64Bytes = (dataUrl: string): number => {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.ceil((b64.length * 3) / 4);
};
