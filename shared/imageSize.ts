/**
 * Pixel dimensions read from an image's header (JPEG, PNG, GIF, WebP) without
 * decoding it. The render API uses this to refuse decompression bombs: a 25MB
 * PNG can legitimately describe a multi-gigapixel canvas, and the renderer
 * allocates w*h*4 bytes for it.
 */
export function readImageSize(b: Uint8Array): { width: number; height: number } | null {
  const u16 = (o: number) => (b[o]! << 8) | b[o + 1]!;
  const u16le = (o: number) => b[o]! | (b[o + 1]! << 8);
  const u24le = (o: number) => b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16);
  const u32 = (o: number) =>
    ((b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!) >>> 0;
  const ascii = (o: number, s: string) => [...s].every((c, i) => b[o + i] === c.charCodeAt(0));

  // PNG: signature, then the IHDR chunk
  if (b.length >= 24 && b[0] === 0x89 && ascii(1, "PNG")) {
    return { width: u32(16), height: u32(20) };
  }

  // GIF: logical screen size
  if (b.length >= 10 && ascii(0, "GIF8")) {
    return { width: u16le(6), height: u16le(8) };
  }

  // WebP: RIFF container, three codec flavours
  if (b.length >= 30 && ascii(0, "RIFF") && ascii(8, "WEBP")) {
    if (ascii(12, "VP8X")) return { width: u24le(24) + 1, height: u24le(27) + 1 };
    if (ascii(12, "VP8L")) {
      const bits = (b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24)) >>> 0;
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (ascii(12, "VP8 ")) return { width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff };
    return null;
  }

  // JPEG: walk the marker segments until a start-of-frame
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o + 4 <= b.length) {
      if (b[o] !== 0xff) return null;
      const marker = b[o + 1]!;
      if (marker === 0xff) {
        o++;
        continue;
      }
      // standalone markers carry no length
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        o += 2;
        continue;
      }
      const len = u16(o + 2);
      const isSof =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) {
        if (o + 9 > b.length) return null;
        return { height: u16(o + 5), width: u16(o + 7) };
      }
      if (len < 2) return null;
      o += 2 + len;
    }
  }
  return null;
}
