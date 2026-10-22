import { describe, it, expect } from "vitest";
import { readImageSize } from "../shared/imageSize";

const bytes = (...parts: (number | string)[]) =>
  Uint8Array.from(
    parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : [p])),
  );
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const le16 = (n: number) => [n & 255, (n >> 8) & 255];
const le24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];

describe("readImageSize", () => {
  it("reads PNG IHDR", () => {
    const png = bytes(
      0x89,
      "PNG",
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      0,
      0,
      0,
      13,
      "IHDR",
      ...be32(6000),
      ...be32(4000),
      8,
      2,
    );
    expect(readImageSize(png)).toEqual({ width: 6000, height: 4000 });
  });

  it("reads a gigapixel PNG header without decoding it", () => {
    const png = bytes(
      0x89,
      "PNG",
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      0,
      0,
      0,
      13,
      "IHDR",
      ...be32(100000),
      ...be32(100000),
      8,
      2,
    );
    expect(readImageSize(png)).toEqual({ width: 100000, height: 100000 });
  });

  it("reads GIF logical screen size", () => {
    expect(readImageSize(bytes("GIF89a", ...le16(320), ...le16(200), 0, 0, 0))).toEqual({
      width: 320,
      height: 200,
    });
  });

  it("reads JPEG SOF after skipped segments (EXIF APP1 first)", () => {
    const app1 = [0xff, 0xe1, 0x00, 0x06, 1, 2, 3, 4];
    const sof = [0xff, 0xc0, 0x00, 0x11, 8, 0x0f, 0xa0, 0x17, 0x70, 3, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(readImageSize(bytes(0xff, 0xd8, ...app1, ...sof))).toEqual({
      width: 0x1770,
      height: 0x0fa0,
    });
  });

  it("does not mistake DHT (FFC4) for a frame header", () => {
    const dht = [0xff, 0xc4, 0x00, 0x04, 0, 0];
    expect(readImageSize(bytes(0xff, 0xd8, ...dht))).toBeNull();
  });

  it("reads WebP VP8X and VP8L", () => {
    const vp8x = bytes(
      "RIFF",
      0,
      0,
      0,
      0,
      "WEBP",
      "VP8X",
      10,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      ...le24(1999),
      ...le24(999),
      0,
      0,
    );
    expect(readImageSize(vp8x)).toEqual({ width: 2000, height: 1000 });
    const w = 799;
    const h = 599;
    const packed = (w | (h << 14)) >>> 0;
    const vp8l = bytes(
      "RIFF",
      0,
      0,
      0,
      0,
      "WEBP",
      "VP8L",
      5,
      0,
      0,
      0,
      0x2f,
      packed & 255,
      (packed >> 8) & 255,
      (packed >> 16) & 255,
      (packed >>> 24) & 255,
      0,
      0,
      0,
      0,
      0,
      0,
    );
    expect(readImageSize(vp8l)).toEqual({ width: 800, height: 600 });
  });

  it("returns null for anything else", () => {
    expect(readImageSize(bytes("hello world, definitely not an image at all"))).toBeNull();
    expect(readImageSize(new Uint8Array(0))).toBeNull();
  });
});
