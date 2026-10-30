import { roundCoord, validCoords } from "~~/shared/geocode";

/**
 * Place name ("City, Country") for a photo's GPS position, for the
 * "location" caption field. Asks our own /api/geocode, which forwards the
 * ~1 km-rounded coordinates to OpenStreetMap Nominatim; only called once the
 * user wants a location (useAutoLocation, ExifPanel), never on import.
 */

/** key "lat,lon" → place (null = nothing nameable there) */
const cache = new Map<string, Promise<string | null>>();

// One request at a time: the server forwards at most one a second anyway,
// and a 50-photo import should queue here rather than run into its 503
let chain: Promise<unknown> = Promise.resolve();

export type GeocodeResult = { ok: true; place: string | null } | { ok: false };

export function reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult> {
  if (!validCoords(latitude, longitude)) return Promise.resolve({ ok: true, place: null });
  const lat = roundCoord(latitude);
  const lon = roundCoord(longitude);
  const key = `${lat},${lon}`;

  let pending = cache.get(key);
  if (!pending) {
    pending = chain.then(async () => {
      const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return ((await res.json()) as { place: string | null }).place;
    });
    chain = pending.catch(() => {});
    cache.set(key, pending);
    // A failure is not remembered, so the next attempt asks again
    pending.catch(() => cache.delete(key));
  }
  return pending.then(
    (place) => ({ ok: true as const, place }),
    (err) => {
      console.warn("[FantasticFrame] location lookup failed:", err);
      return { ok: false as const };
    },
  );
}
