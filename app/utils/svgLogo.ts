/** Pure helpers for SVG logos (aspect probing, data-URL round-trip, recoloring) */

// Extract the intrinsic aspect ratio (width / height) from an SVG markup
// string. Checks viewBox first (most reliable for logos that use it, even
// when width/height are missing or set to "100%"), then falls back to the
// width/height attributes. Returns 0 if nothing usable is found.
export function extractSvgAspect(svg: string): number {
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    if (doc.querySelector("parsererror")) return 0;
    const root = doc.documentElement;
    const vb = root.getAttribute("viewBox");
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number);
      if (parts.length === 4) {
        const [, , w, h] = parts;
        if (w !== undefined && h !== undefined && w > 0 && h > 0) return w / h;
      }
    }
    const wAttr = parseFloat(root.getAttribute("width") || "");
    const hAttr = parseFloat(root.getAttribute("height") || "");
    if (!Number.isNaN(wAttr) && !Number.isNaN(hAttr) && hAttr > 0) return wAttr / hAttr;
  } catch {
    /* ignore */
  }
  return 0;
}

// Encode raw SVG markup as a base64 data URL — matches what FileReader.readAsDataURL
// produces for an uploaded .svg file, so the client WASM renderer and the takumi
// native backend treat pasted and uploaded SVGs identically. Uses TextEncoder so
// non-Latin1 characters (CJK, accented letters) survive intact.
export function encodeSvgDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}

// Inverse of encodeSvgDataUrl: turn an `data:image/svg+xml;...` URL back into raw
// markup, so a saved photo's logo can be re-colored after a photo switch.
export function decodeSvgDataUrl(url: string): string {
  try {
    if (url.startsWith("data:image/svg+xml;base64,")) {
      const b64 = url.slice("data:image/svg+xml;base64,".length);
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
    const idx = url.indexOf(",");
    if (idx === -1) return "";
    return decodeURIComponent(url.slice(idx + 1));
  } catch {
    return "";
  }
}

// Walk every element in the SVG and replace non-"none" / non-"transparent"
// fills & strokes with `color`. Uses DOMParser so attribute-based SVGs
// (the common case for logo exports) are handled correctly; CSS-in-<style>
// SVGs would need a style override which we deliberately don't do — most
// users paste attribute-styled logos, and a global !important style would
// also clobber `fill="none"` outline-only paths.
//
// NB: for `stroke` we only override when an explicit attribute is present.
// SVG's default stroke is "none", so an element without `stroke="..."`
// has no outline — adding one would draw a thin border where there was
// none (visible artifact when recoloring a dark logo against a dark
// background). `fill`, on the other hand, defaults to black, so a missing
// fill attribute does need to be overridden to recolor the shape.
export function applySvgColor(svg: string, color: string): string {
  if (!color) return svg;
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    if (doc.querySelector("parsererror")) return svg;
    doc.querySelectorAll("*").forEach((el) => {
      const fill = el.getAttribute("fill");
      if (fill !== "none" && fill !== "transparent") el.setAttribute("fill", color);
      const stroke = el.getAttribute("stroke");
      if (stroke !== null && stroke !== "" && stroke !== "none" && stroke !== "transparent") {
        el.setAttribute("stroke", color);
      }
    });
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return svg;
  }
}
