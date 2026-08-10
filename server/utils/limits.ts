import { createError, readRawBody, type H3Event } from "h3";
// Caps + estimateBase64Bytes live in shared/limits.ts so the client (pre-flight)
// and the server (enforcement) use the SAME numbers.
export {
  MAX_RENDER_BODY_BYTES,
  MAX_BATCH_BODY_BYTES,
  MAX_PHOTO_BYTES,
  MAX_TOTAL_PHOTO_BYTES,
  MAX_BATCH_ITEMS,
  MAX_JOBS,
  estimateBase64Bytes,
} from "../../shared/limits";

const tooLarge = (maxBytes: number) =>
  createError({
    statusCode: 413,
    statusMessage: "Payload Too Large",
    message: `Request body exceeds ${Math.round(maxBytes / 1e6)}MB limit`,
  });

/**
 * Reads and JSON-parses a request body with a byte cap.
 *
 * The read itself is delegated to h3's `readRawBody` — the SAME reader the
 * pre-hardening code used (via readBody), which works in every runtime
 * (dev server, Bun production, Node). A hand-rolled stream reader broke in
 * production: `event.node.req.body` is a Uint8Array there, which hit the
 * `String(source)` fallback and produced non-JSON garbage ("1,2,3,...").
 *
 * h3 offers no mid-stream limit, so the cap is enforced two ways:
 * 1. upfront: reject from content-length when the client sent one;
 * 2. after read: check the buffered byte length (bounds the JSON we parse
 *    and keeps the per-endpoint limits real).
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

  const raw = await readRawBody(event, "utf8");
  if (raw == null || raw === "") return {};
  if (Buffer.byteLength(raw) > maxBytes) throw tooLarge(maxBytes);
  return parseJson(raw);
}

function parseJson(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw createError({ statusCode: 400, message: "Request body must be valid JSON" });
  }
}
