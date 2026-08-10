import { createError, type H3Event } from "h3";

/**
 * In-memory render service limits — every render payload is buffered in RAM
 * (base64 input + zip output) and takumi's Rust core can only decode
 * JPEG/PNG/WebP/GIF, so a batch of huge PNGs is the worst case. These caps
 * turn that into a clear 4xx response instead of an OOM.
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

const tooLarge = (maxBytes: number) =>
  createError({
    statusCode: 413,
    statusMessage: "Payload Too Large",
    message: `Request body exceeds ${Math.round(maxBytes / 1e6)}MB limit`,
  });

/**
 * Reads and JSON-parses a request body with a hard byte cap enforced WHILE
 * streaming. h3's readRawBody has no limit option, so an unbounded upload
 * would be fully buffered into memory before we could reject it.
 */
export async function readJsonBodyCapped(
  event: H3Event,
  maxBytes: number,
): Promise<Record<string, unknown>> {
  const req = event.node.req as any;

  // Fast path: reject upfront when the client sent a content-length
  const headers = req.headers;
  const contentLength = Number(
    typeof headers?.get === "function"
      ? headers.get("content-length")
      : headers?.["content-length"],
  );
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw tooLarge(maxBytes);
  }

  // h3's readRawBody resolves the body from the web Request stream, then
  // falls back to reading event.node.req ITSELF as a Node-style stream
  // (req.body/req.rawBody are undefined on the dev server). Mirror that so
  // the byte cap applies mid-stream.
  let source: any = null;
  if (event.web?.request?.body != null) source = event.web.request.body;
  else if (req.body != null) source = req.body;
  else if (req.rawBody != null) source = req.rawBody;
  else if (typeof req.on === "function") source = req;

  if (source == null) return {};
  if (typeof source === "string") {
    if (Buffer.byteLength(source) > maxBytes) throw tooLarge(maxBytes);
    return parseJson(source);
  }
  if (Buffer.isBuffer(source)) {
    if (source.length > maxBytes) throw tooLarge(maxBytes);
    return parseJson(source.toString("utf8"));
  }

  let total = 0;
  const chunks: Buffer[] = [];
  const push = (chunk: unknown) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    total += buf.length;
    if (total > maxBytes) throw tooLarge(maxBytes);
    chunks.push(buf);
  };

  if (typeof source.pipeTo === "function") {
    // web ReadableStream (Bun / edge)
    await source.pipeTo(new WritableStream({ write: push }));
  } else if (typeof source.on === "function") {
    // Node IncomingMessage (h3's own fallback path)
    await new Promise((resolve, reject) => {
      source.on("data", push).on("end", resolve).on("error", reject);
    });
  } else if (source.constructor === Object || source instanceof URLSearchParams) {
    return source as Record<string, unknown>;
  } else {
    return parseJson(String(source));
  }

  return parseJson(Buffer.concat(chunks).toString("utf8"));
}

function parseJson(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw createError({ statusCode: 400, message: "Request body must be valid JSON" });
  }
}
