import exifr from "exifr";
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
 * Formats aperture value
 * e.g. 2.8 → "f/2.8", 1.2 → "f/1.2"
 */
export function formatFNumber(fNumber: number): string {
  if (typeof fNumber !== "number" || !Number.isFinite(fNumber)) return "";
  return `f/${fNumber % 1 === 0 ? fNumber.toFixed(0) : fNumber.toFixed(1)}`;
}

/**
 * Formats focal length
 * e.g. 50 → "50mm"
 */
export function formatFocalLength(mm: number): string {
  return `${Math.round(mm)}mm`;
}

/**
 * Formats ISO
 * e.g. 100 → "ISO 100"
 */
export function formatISO(iso: number): string {
  return `ISO ${iso}`;
}

/**
 * Formats exposure compensation
 * e.g. 0.3 → "+0.3 EV", -1 → "-1.0 EV", 0 → "±0 EV"
 */
export function formatExposureBias(bias: number): string {
  if (typeof bias !== "number" || !Number.isFinite(bias)) return "";
  if (bias === 0) return "±0 EV";
  const sign = bias > 0 ? "+" : "";
  return `${sign}${bias.toFixed(1)} EV`;
}

/**
 * Formats EXIF fields into a display string map
 */
export function formatExifForDisplay(exif: ExifData): Record<string, string> {
  const display: Record<string, string> = {};

  if (exif.make) display.make = exif.make;
  if (exif.model) display.model = exif.model;
  if (exif.lensModel) display.lensModel = exif.lensModel;
  if (exif.fNumber != null) display.fNumber = formatFNumber(exif.fNumber);
  if (exif.exposureTimeFormatted) {
    display.exposureTime = exif.exposureTimeFormatted;
  } else if (exif.exposureTime != null) {
    display.exposureTime = formatExposureTime(exif.exposureTime);
  }
  if (exif.iso != null) display.iso = formatISO(exif.iso);
  if (exif.focalLength != null) display.focalLength = formatFocalLength(exif.focalLength);
  if (exif.focalLengthIn35mm != null) {
    display.focalLengthIn35mm = formatFocalLength(exif.focalLengthIn35mm);
  }
  if (exif.exposureBias != null) display.exposureBias = formatExposureBias(exif.exposureBias);
  if (exif.dateTimeOriginal) {
    display.dateTimeOriginal = exif.dateTimeOriginal.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
  if (exif.latitude != null && exif.longitude != null) {
    display.gps = `${exif.latitude.toFixed(6)}, ${exif.longitude.toFixed(6)}`;
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

      if (!raw) {
        return { raw: {} };
      }

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

      const exifData: ExifData = {
        make: toString(raw.Make),
        model: toString(raw.Model),
        fNumber,
        exposureTime,
        exposureTimeFormatted: exposureTime ? formatExposureTime(exposureTime) : undefined,
        iso,
        focalLength,
        focalLengthIn35mm,
        dateTimeOriginal: raw.DateTimeOriginal ? new Date(raw.DateTimeOriginal) : undefined,
        lensModel: toString(raw.LensModel) ?? toString(raw.Lens),
        latitude,
        longitude,
        exposureBias,
        raw,
      };

      return exifData;
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

  /**
   * Reads EXIF for multiple files at once
   */
  async function readExifBatch(files: File[]): Promise<ExifData[]> {
    return Promise.all(files.map(readExif));
  }

  /**
   * Parses EXIF from an ArrayBuffer (for data already loaded into memory)
   */
  async function readExifFromBuffer(buffer: ArrayBuffer): Promise<ExifData> {
    const blob = new Blob([buffer]);
    const file = new File([blob], "buffer-image", { type: "image/jpeg" });
    return readExif(file);
  }

  return {
    /** Whether parsing is in progress */
    isLoading: readonly(isLoading),
    /** Last parse error message */
    error: readonly(error),
    /** Parse a single file */
    readExif,
    /** Parse multiple files */
    readExifBatch,
    /** Parse from an ArrayBuffer */
    readExifFromBuffer,
    /** Format EXIF data into display strings */
    formatExifForDisplay,
  };
}
