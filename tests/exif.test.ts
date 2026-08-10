import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import exifr from "exifr";
import { extractExif, formatExifForDisplay } from "../app/composables/useExifReader";
import { formatCaptureDate } from "../shared/render";

// Same options the app passes to exifr (see useExifReader.readExif)
const EXIFR_OPTIONS = {
  exif: true,
  iptc: true,
  xmp: true,
  gps: true,
  makerNote: false,
  icc: false,
};

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url));

async function parseFixture(name: string) {
  const raw = await exifr.parse(fixture(name), EXIFR_OPTIONS);
  return extractExif(raw);
}

describe("extractExif (real exifr pipeline)", () => {
  it("extracts every field from a photo with a Make tag", async () => {
    const exif = await parseFixture("with-make.jpg");
    expect(exif.make).toBe("TestCam");
    expect(exif.model).toBe("X-1");
    expect(exif.fNumber).toBe(2.8);
    expect(exif.exposureTime).toBe(0.004);
    expect(exif.exposureTimeFormatted).toBe("1/250");
    expect(exif.iso).toBe(400);
    expect(exif.focalLength).toBe(50);
    expect(exif.dateTimeOriginal).toEqual(new Date(2024, 0, 2, 3, 4, 5));
  });

  it("regression A1: photo WITHOUT a Make tag keeps all other EXIF", async () => {
    const exif = await parseFixture("no-make.jpg");
    expect(exif.make).toBeUndefined();
    // previously `raw.Make.toString()` threw and the catch discarded ALL fields
    expect(exif.model).toBe("X-1");
    expect(exif.fNumber).toBe(2.8);
    expect(exif.exposureTime).toBe(0.004);
    expect(exif.exposureTimeFormatted).toBe("1/250");
    expect(exif.iso).toBe(400);
    expect(exif.focalLength).toBe(50);
    expect(exif.dateTimeOriginal).toEqual(new Date(2024, 0, 2, 3, 4, 5));
  });

  it("rounds float noise from EXIF rationals at ingestion (regression: f/1.8)", () => {
    const exif = extractExif({
      FNumber: 1.7999999999999998,
      ExposureBiasValue: 0.30000000000000004,
    });
    expect(exif.fNumber).toBe(1.8);
    expect(exif.exposureBias).toBe(0.3);
    // fallback derivation from ApertureValue is rounded too
    expect(extractExif({ ApertureValue: 1.7999999999999998 }).fNumber).toBe(1.8);
  });

  it("normalizes corporate brand names", () => {
    const exif = extractExif({ Make: "NIKON CORPORATION", Model: "D850" });
    expect(exif.make).toBe("Nikon");
    expect(exif.model).toBe("D850");
  });

  it("returns an empty shape for a falsy raw result", () => {
    expect(extractExif(undefined)).toEqual({ raw: {} });
    expect(extractExif(null as unknown as Record<string, unknown>)).toEqual({ raw: {} });
  });

  it("falls back to parsing the EXIF 'YYYY:MM:DD HH:MM:SS' string layout", () => {
    const exif = extractExif({ DateTimeOriginal: "2024:01:02 03:04:05" });
    expect(exif.dateTimeOriginal).toEqual(new Date(2024, 0, 2, 3, 4, 5));
  });

  it("handles non-string Make values without crashing", () => {
    const exif = extractExif({ Make: 12345 as unknown as string });
    expect(exif.make).toBe("12345");
  });
});

describe("formatExifForDisplay", () => {
  it("formats the date with the SAME canonical formatter as the renderer (regression A4)", () => {
    const d = new Date(2024, 0, 2, 3, 4, 5);
    const display = formatExifForDisplay({ dateTimeOriginal: d });
    expect(display.dateTimeOriginal).toBe("2024/1/2");
    expect(display.dateTimeOriginal).toBe(formatCaptureDate(d));
  });

  it("formats GPS like the renderer does", () => {
    const display = formatExifForDisplay({ latitude: 50.1234567, longitude: 8.6543219 });
    expect(display.gps).toBe("50.123457, 8.654322");
  });

  it("skips empty fields", () => {
    expect(formatExifForDisplay({})).toEqual({});
    expect(formatExifForDisplay({ iso: 0 })).toEqual({});
  });
});
