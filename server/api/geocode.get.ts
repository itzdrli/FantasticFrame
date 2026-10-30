import { defineEventHandler, createError, getQuery, setHeader } from "h3";
import { enforceGeocodeRateLimit } from "../utils/guard";
import { lookupPlace } from "../utils/nominatim";
import { roundCoord, validCoords } from "../../shared/geocode";

/**
 * GET /api/geocode?lat=…&lon=… → { place: string | null }
 *
 * Place name for the "location" caption field. Rounds again server-side so a
 * client can never send (or have forwarded) more precision than ~1 km.
 * Coordinates are not logged.
 */
export default defineEventHandler(async (event) => {
  enforceGeocodeRateLimit(event);

  const query = getQuery(event);
  const lat = Number(query.lat);
  const lon = Number(query.lon);
  if (!validCoords(lat, lon)) {
    throw createError({ statusCode: 400, message: "lat/lon must be valid coordinates" });
  }

  const place = await lookupPlace(roundCoord(lat), roundCoord(lon));
  setHeader(event, "Cache-Control", "no-store");
  return { place: place || null };
});
