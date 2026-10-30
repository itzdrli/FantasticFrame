import { createError, type H3Event } from "h3";

/**
 * Abuse guards for the public endpoints: per-client rate limits and a cap on
 * concurrent renders. In-memory only (single instance, no state kept beyond a
 * few counters).
 */

const WINDOW_MS = 60_000;
const MAX_CONCURRENT_RENDERS = 2;
const MAX_QUEUED_RENDERS = 6;

/**
 * Client address for rate limiting. Behind a reverse proxy the LEFT-most
 * x-forwarded-for entry is client-controlled; the proxy appends the address it
 * actually saw on the right, so that one is used.
 */
function clientKey(event: H3Event): string {
  const xff = event.node.req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff.join(",") : (xff ?? "");
  const last = raw.split(",").pop()?.trim();
  return last || event.node.req.socket?.remoteAddress || "unknown";
}

/** A per-client limit of `max` requests a minute, with its own counters */
function rateLimiter(max: number, message: string) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, v] of hits) if (v.resetAt <= now) hits.delete(key);
  }, WINDOW_MS);
  sweep.unref?.();

  return (event: H3Event) => {
    const key = clientKey(event);
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }
    if (++entry.count > max) throw createError({ statusCode: 429, message });
  };
}

export const enforceRateLimit = rateLimiter(
  20,
  "Too many render requests — wait a minute and try again",
);

/** Place-name lookups: a batch import of GPS photos asks once per ~1 km cell */
export const enforceGeocodeRateLimit = rateLimiter(
  60,
  "Too many location lookups — wait a minute and try again",
);

let running = 0;
const waiting: (() => void)[] = [];

/** Runs `fn` once a render slot is free; rejects with 503 when the queue is full */
export async function withRenderSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT_RENDERS) {
    if (waiting.length >= MAX_QUEUED_RENDERS) {
      throw createError({ statusCode: 503, message: "Server is busy — try again shortly" });
    }
    await new Promise<void>((resolve) => waiting.push(resolve));
  } else {
    running++;
  }
  try {
    return await fn();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running--;
  }
}
