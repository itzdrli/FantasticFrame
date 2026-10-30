import { createError } from "h3";
import { placeFromAddress, type NominatimAddress } from "../../shared/geocode";

/**
 * Reverse geocoding via OpenStreetMap Nominatim, on behalf of the browser so
 * the user's IP address is never passed on and the CSP stays `'self'`.
 * Nominatim's usage policy (operations.osmfoundation.org/policies/nominatim)
 * asks for at most one request a second, an identifying User-Agent and
 * caching: requests are serialised here, and answers are cached in memory.
 * Coordinates arrive already rounded to ~1 km (shared/geocode.ts).
 */

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "FantasticFrame/1.0 (+https://ff.itzdrli.cc; me@itzdrli.cc)";
const MIN_INTERVAL_MS = 1100;
const TIMEOUT_MS = 8000;
/** Lookups waiting for their turn; beyond this the client is told to retry */
const MAX_QUEUE = 30;
const CACHE_SIZE = 5000;

/** key "lat,lon" → place ("" = nowhere nameable). Map order doubles as LRU order. */
const cache = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();
let queued = 0;
let lastCall = 0;

function remember(key: string, place: string) {
  cache.delete(key);
  cache.set(key, place);
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!);
}

async function fetchPlace(lat: number, lon: number): Promise<string> {
  const wait = lastCall + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const url = new URL(ENDPOINT);
  url.search = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lon),
    // 10 = city level; finer would only name streets and suburbs
    zoom: "10",
    addressdetails: "1",
    "accept-language": "en",
  }).toString();
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const body = (await res.json()) as { address?: NominatimAddress };
  return placeFromAddress(body.address) ?? "";
}

/** The place name for (already rounded) coordinates; "" when there is none */
export async function lookupPlace(lat: number, lon: number): Promise<string> {
  const key = `${lat},${lon}`;
  const hit = cache.get(key);
  if (hit !== undefined) {
    remember(key, hit);
    return hit;
  }
  if (queued >= MAX_QUEUE) {
    throw createError({ statusCode: 503, message: "Location lookup is busy — try again shortly" });
  }

  queued++;
  const job = queue.then(async () => {
    // Another request may have filled the cache while this one waited
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const place = await fetchPlace(lat, lon);
    remember(key, place);
    return place;
  });
  queue = job.catch(() => {});
  try {
    return await job;
  } catch (err) {
    // Not cached: a timeout or outage should not stick to these coordinates
    console.warn("[geocode] lookup failed:", err instanceof Error ? err.message : err);
    throw createError({ statusCode: 502, message: "Location lookup failed" });
  } finally {
    queued--;
  }
}
