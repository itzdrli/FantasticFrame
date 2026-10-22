import { createError, type H3Event } from "h3";

/**
 * Abuse guards for the public render endpoint: a per-client rate limit and a
 * cap on concurrent renders. In-memory only (single instance, no state kept
 * beyond a few counters).
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_CONCURRENT_RENDERS = 2;
const MAX_QUEUED_RENDERS = 6;

const hits = new Map<string, { count: number; resetAt: number }>();

const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, v] of hits) if (v.resetAt <= now) hits.delete(key);
}, WINDOW_MS);
sweep.unref?.();

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

export function enforceRateLimit(event: H3Event) {
  const key = clientKey(event);
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  if (++entry.count > MAX_REQUESTS_PER_WINDOW) {
    throw createError({
      statusCode: 429,
      message: "Too many render requests — wait a minute and try again",
    });
  }
}

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
