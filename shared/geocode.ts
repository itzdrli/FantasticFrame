/**
 * Reverse geocoding for the "location" caption field, shared by the app
 * (cache keys) and the server proxy (server/api/geocode.get.ts), which asks
 * OpenStreetMap Nominatim. Kept free of Nuxt/h3 imports so it is unit-tested.
 */

/**
 * Coordinates are rounded to 2 decimals (~1 km) before they leave the
 * browser: plenty for naming a city, and the exact spot a photo was taken is
 * never sent anywhere. It also makes nearby photos share one lookup.
 */
export const GEO_PRECISION = 2;

export function roundCoord(n: number): number {
  return Number(n.toFixed(GEO_PRECISION));
}

export function validCoords(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
  );
}

/** The `address` object of a Nominatim reverse result (only what we read) */
export type NominatimAddress = Partial<
  Record<
    | "city"
    | "town"
    | "village"
    | "municipality"
    | "county"
    | "state"
    | "region"
    | "country"
    | "ISO3166-2-lvl3"
    | "ISO3166-2-lvl4",
    string
  >
>;

/**
 * Regions whose Nominatim "city" is a district, named by the city people
 * know instead: China's municipalities come back as city "Pudong", state
 * "Shanghai"; Tokyo's wards as city "Shibuya" with no prefecture at all.
 */
const CITY_OF_REGION: Record<string, string> = {
  "CN-BJ": "Beijing",
  "CN-SH": "Shanghai",
  "CN-TJ": "Tianjin",
  "CN-CQ": "Chongqing",
  "JP-13": "Tokyo",
};

/** Places named on their own, like city-states: "Hong Kong", not "Hong Kong, China" */
const STANDALONE: Record<string, string> = {
  "CN-HK": "Hong Kong",
  "CN-MO": "Macau",
};

/** "City, Country" from a Nominatim address, or undefined when it names no place */
export function placeFromAddress(address: NominatimAddress | undefined): string | undefined {
  if (!address) return undefined;
  const lvl3 = address["ISO3166-2-lvl3"];
  const lvl4 = address["ISO3166-2-lvl4"];
  const standalone = (lvl3 && STANDALONE[lvl3]) || (lvl4 && STANDALONE[lvl4]);
  if (standalone) return standalone;

  const city =
    (lvl4 && CITY_OF_REGION[lvl4]) ||
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    address.state ||
    address.region;
  const country = address.country;
  if (!city) return country || undefined;
  return country && country !== city ? `${city}, ${country}` : city;
}
