import exifr from "exifr";
import { formatExif } from "~~/shared/render";
import type { ExifData } from "~/types";

/**
 * Safely converts a value to number, handling arrays/objects returned by exifr
 */
function toNumber(val: unknown): number | undefined {
  if (val == null) return undefined;
  if (Array.isArray(val)) val = val[0];
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Safely converts a value to string
 */
function toString(val: unknown): string | undefined {
  if (val == null) return undefined;
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return String(val[0] ?? "");
  return String(val);
}

/**
 * Formats shutter speed as a human-readable string
 * e.g. 0.004 → "1/250", 1 → "1\"", 30 → "30\""
 */
function formatExposureTime(seconds: number): string {
  if (seconds >= 1) {
    return `${seconds}"`;
  }
  const denominator = Math.round(1 / seconds);
  return `1/${denominator}`;
}

/**
 * Converts a raw exifr parse result into the app's ExifData shape.
 *
 * Kept separate from the composable so it can be unit-tested directly, and so
 * a missing tag (e.g. cameras that don't record `Make`) can never abort the
 * whole parse — previously `raw.Make.toString()` threw and the catch block
 * discarded every other field along with it.
 */
export function extractExif(raw: Record<string, unknown> | undefined): ExifData {
  if (!raw) return { raw: {} };

  // Safely extract numeric fields in case exifr returns non-number types
  const fNumber = toNumber(raw.FNumber) ?? toNumber(raw.ApertureValue);
  const exposureTime = toNumber(raw.ExposureTime);
  const iso = toNumber(raw.ISO) ?? toNumber(raw.ISOSpeedRatings);
  const focalLength = toNumber(raw.FocalLength);
  const focalLengthIn35mm =
    toNumber(raw.FocalLengthIn35mmFormat) ?? toNumber(raw.FocalLengthIn35mmFilm);
  const exposureBias = toNumber(raw.ExposureBiasValue);
  const latitude = toNumber(raw.latitude);
  const longitude = toNumber(raw.longitude);

  // Make is optional: many files (screenshots, scans, stripped exports) have
  // full EXIF but no Make tag. `String()` keeps non-string values safe.
  let make = raw.Make ? String(raw.Make) : undefined;
  if (make) {
    const brandNames: Record<string, string> = {
      "NIKON CORPORATION": "Nikon",
      SONY: "Sony",
    };
    make = brandNames[make] ?? make;
  }

  return {
    make,
    model: toString(raw.Model),
    fNumber,
    exposureTime,
    exposureTimeFormatted: exposureTime ? formatExposureTime(exposureTime) : undefined,
    iso,
    focalLength,
    focalLengthIn35mm,
    dateTimeOriginal: toDate(raw.DateTimeOriginal),
    lensModel: toString(raw.LensModel) ?? toString(raw.Lens),
    latitude,
    longitude,
    exposureBias,
    raw,
  };
}

/**
 * Safely converts an EXIF date value to a Date. exifr usually revives the tag
 * into a Date already; when it doesn't (or the input is a raw string), fall
 * back to parsing the EXIF "YYYY:MM:DD HH:MM:SS" layout that `new Date()`
 * cannot handle.
 */
function toDate(val: unknown): Date | undefined {
  if (val == null) return undefined;
  const d = val instanceof Date ? val : new Date(val as string | number);
  if (!Number.isNaN(d.getTime())) return d;
  if (typeof val === "string") {
    const [datePart, timePart] = val.trim().split(" ");
    const [y, m, day] = (datePart || "").split(":").map(Number);
    const [hh, mm, ss] = (timePart || "").split(":").map(Number);
    if (y && m && day) {
      const parsed = new Date(y, m - 1, day, hh || 0, mm || 0, ss || 0);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return undefined;
}

/**
 * Formats EXIF fields into a display string map.
 *
 * Delegates every field to the renderer's `formatExif` (shared/render.ts) so
 * the live preview, the EXIF panel and the exported image can never drift
 * apart — the footer-height estimation in PreviewPanel depends on these exact
 * strings matching what buildRenderTree rasterizes.
 */
export function formatExifForDisplay(exif: ExifData): Record<string, string> {
  const display: Record<string, string> = {};
  const fields = [
    "make",
    "model",
    "lensModel",
    "fNumber",
    "exposureTime",
    "iso",
    "focalLength",
    "focalLengthIn35mm",
    "exposureBias",
    "dateTimeOriginal",
    "gps",
  ] as const;
  for (const field of fields) {
    const value = formatExif(exif, field);
    if (value) display[field] = value;
  }
  return display;
}

/**
 * EXIF reader composable
 *
 * Provides the ability to extract EXIF data from File objects,
 * using exifr to parse EXIF / IPTC / XMP from major camera brands.
 */
export function useExifReader() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Parses EXIF data from a File object
   */
  async function readExif(file: File): Promise<ExifData> {
    isLoading.value = true;
    error.value = null;

    try {
      // exifr accepts File / Blob / ArrayBuffer directly
      const raw = await exifr.parse(file, {
        // Try to extract all commonly used fields
        exif: true,
        iptc: true,
        xmp: true,
        gps: true,
        // Parse Makernote for more lens/body info
        makerNote: false,
        // Skip ICC profile extraction
        icc: false,
      });

      return extractExif(raw);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to read EXIF";
      error.value = message;
      console.warn("[useExifReader] Parse failed:", message);
      // Return empty EXIF on failure so the flow isn't blocked
      return { raw: {} };
    } finally {
      isLoading.value = false;
    }
  }

  return {
    /** Whether parsing is in progress */
    isLoading: readonly(isLoading),
    /** Last parse error message */
    error: readonly(error),
    /** Parse a single file */
    readExif,
  };
}
