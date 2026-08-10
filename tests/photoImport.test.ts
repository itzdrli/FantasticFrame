import { describe, it, expect } from "vitest";
import { isSupportedImage, SUPPORTED_IMAGE_TYPES } from "../app/utils/photoImport";

/** Minimal File-like object — node's test env has no File constructor */
const fakeFile = (name: string, type: string) => ({ name, type }) as File;

describe("isSupportedImage (import whitelist)", () => {
  it("accepts the end-to-end supported formats (browser decode + takumi decode)", () => {
    expect(SUPPORTED_IMAGE_TYPES).toEqual(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    for (const t of SUPPORTED_IMAGE_TYPES) {
      expect(isSupportedImage(fakeFile("photo", t))).toBe(true);
    }
  });

  it("falls back to the file extension when the browser reports an empty MIME type", () => {
    expect(isSupportedImage(fakeFile("DSC0001.jpg", ""))).toBe(true);
    expect(isSupportedImage(fakeFile("DSC0001.jpeg", ""))).toBe(true);
    expect(isSupportedImage(fakeFile("shot.png", ""))).toBe(true);
    expect(isSupportedImage(fakeFile("anim.gif", ""))).toBe(true);
  });

  it("rejects formats the renderer cannot decode (HEIC/HEIF/AVIF/BMP/TIFF/SVG)", () => {
    // Regression: the UI used to claim "Supports … HEIC", but takumi's Rust
    // core (browser WASM + server native) only decodes JPEG/PNG/WebP/GIF, and
    // Chrome/Firefox can't even <img>-decode HEIC (which used to hang import).
    expect(isSupportedImage(fakeFile("IMG_1234.heic", "image/heic"))).toBe(false);
    expect(isSupportedImage(fakeFile("IMG_1234.heif", "image/heif"))).toBe(false);
    expect(isSupportedImage(fakeFile("img.avif", "image/avif"))).toBe(false);
    expect(isSupportedImage(fakeFile("scan.bmp", "image/bmp"))).toBe(false);
    expect(isSupportedImage(fakeFile("scan.tiff", "image/tiff"))).toBe(false);
    expect(isSupportedImage(fakeFile("logo.svg", "image/svg+xml"))).toBe(false);
    expect(isSupportedImage(fakeFile("notes.txt", "text/plain"))).toBe(false);
  });
});
