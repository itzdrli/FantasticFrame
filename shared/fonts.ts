/**
 * Fonts. Everything is served from this origin — no request ever goes to
 * Google, so the visitor's IP is not shared with a font CDN.
 *
 * - Google families are downloaded at build time by scripts/fetch-fonts.mjs
 *   into public/fonts/google/ (woff2 slices + fonts.css + manifest.json).
 * - LXGW WenKai and DSEG7 are not on Google Fonts; they are committed under
 *   public/fonts/.
 */

export interface GoogleFontSpec {
  name: string;
  weights: number[];
}

const REGULAR_BOLD = [400, 700];

/** Single source of truth for the font CSS, the fetch script and the export loader */
export const GOOGLE_FONTS: readonly GoogleFontSpec[] = [
  { name: "Cormorant Garamond", weights: REGULAR_BOLD },
  { name: "DM Sans", weights: REGULAR_BOLD },
  { name: "IBM Plex Mono", weights: REGULAR_BOLD },
  { name: "IBM Plex Sans", weights: REGULAR_BOLD },
  { name: "IBM Plex Serif", weights: REGULAR_BOLD },
  { name: "Inter", weights: REGULAR_BOLD },
  { name: "JetBrains Mono", weights: REGULAR_BOLD },
  { name: "Lora", weights: REGULAR_BOLD },
  { name: "Noto Sans SC", weights: REGULAR_BOLD },
  { name: "Noto Serif SC", weights: REGULAR_BOLD },
  { name: "Outfit", weights: REGULAR_BOLD },
  { name: "Playfair Display", weights: REGULAR_BOLD },
  { name: "Roboto", weights: REGULAR_BOLD },
  { name: "Source Sans 3", weights: REGULAR_BOLD },
  { name: "Space Grotesk", weights: REGULAR_BOLD },
  { name: "ZCOOL KuaiLe", weights: [400] },
  { name: "ZCOOL QingKe HuangYou", weights: [400] },
  { name: "ZCOOL XiaoWei", weights: [400] },
];

export const GOOGLE_FONT_BASE = "/fonts/google";

/** Covers CJK glyphs for templates whose chosen family has none */
export const CJK_FALLBACK_FAMILY = "Noto Sans SC";

export const LXGW_FAMILY = "LXGW WenKai";
export const LXGW_FONT_PATH = "/fonts/LXGWWenKai-Regular.ttf";

/**
 * Self-hosted faces that are single files, by family (DOM @font-face lives in
 * main.css). DSEG7 Classic (OFL, keshikan) draws the retro date stamp.
 */
export const SELF_HOSTED_FONTS: Record<string, string> = {
  [LXGW_FAMILY]: LXGW_FONT_PATH,
  "DSEG7 Classic": "/fonts/DSEG7Classic-Bold.woff2",
};

const KNOWN_FAMILIES = new Set<string>([
  ...GOOGLE_FONTS.map((f) => f.name),
  ...Object.keys(SELF_HOSTED_FONTS),
]);

/** Family names in a CSS font-family list that we ship, in order, without duplicates */
export function knownFamiliesIn(fontFamily: string | undefined): string[] {
  if (!fontFamily) return [];
  const out: string[] = [];
  for (const part of fontFamily.split(",")) {
    const name = part.trim().replace(/^['"]|['"]$/g, "");
    if (KNOWN_FAMILIES.has(name) && !out.includes(name)) out.push(name);
  }
  return out;
}
