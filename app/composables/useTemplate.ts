import type { TemplateConfig } from "~/types";

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  borderRadius: 0,
  backgroundColor: "#FFFFFF",
  paddingTop: 40,
  paddingBottom: 40,
  paddingHorizontal: 40,
  showLogo: true,
  logoAuto: false,
  logoPosition: "center",
  logoText: "",
  infoLayout: "horizontal",
  visibleFields: ["model", "fNumber", "exposureTime", "iso", "focalLength"],
  fontFamily: "Inter, sans-serif",
  fontSize: 16,
  fontColor: "#333333",
  modelFontSize: 26,
  canvasMode: "original",
  backgroundMode: "solid",
  backgroundBlur: 40,
  backgroundDim: 20,
  photoShadow: 0,
  captionStyle: "stack",
  secondaryColor: "#333333",
  letterSpacing: 0,
  dateStamp: false,
  dateStampColor: "#FF7A1A",
  edgeText: "",
};

/** Template new photos start with */
export const DEFAULT_TEMPLATE_ID = "leica";

/** Exposure fields in the order most watermark styles print them */
const EXPOSURE = ["focalLength", "fNumber", "exposureTime", "iso"] as const;

export interface PresetMeta {
  id: string;
  group: "modern" | "retro";
}

/** Display order of the presets; names live in i18n presets.<id> */
export const PRESET_LIST: PresetMeta[] = [
  { id: "leica", group: "modern" },
  { id: "gallery", group: "modern" },
  { id: "frosted", group: "modern" },
  { id: "card", group: "modern" },
  { id: "cinema", group: "modern" },
  { id: "magazine", group: "modern" },
  { id: "polaroid", group: "retro" },
  { id: "datestamp", group: "retro" },
  { id: "negative", group: "retro" },
];

export const PRESET_TEMPLATES: Record<string, Partial<TemplateConfig>> = {
  // ─── Modern ────────────────────────────────────────────────────────────────

  // The camera-watermark bar: full-bleed photo over a white strip, model and
  // lens on the left, brand | exposure over date on the right
  leica: {
    backgroundColor: "#FFFFFF",
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    captionStyle: "split",
    showLogo: true,
    logoAuto: true,
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontColor: "#1A1A1A",
    secondaryColor: "#8C8C8C",
    fontSize: 15,
    modelFontSize: 26,
    visibleFields: ["model", "lensModel", ...EXPOSURE, "dateTimeOriginal"],
  },

  // Museum mat: wide even white margin, one quiet tracked line of specs
  gallery: {
    backgroundColor: "#F7F7F5",
    paddingTop: 72,
    paddingBottom: 6,
    paddingHorizontal: 72,
    showLogo: false,
    logoPosition: "center",
    fontFamily: "'DM Sans', sans-serif",
    fontColor: "#1A1A1A",
    secondaryColor: "#8E8E8A",
    fontSize: 13,
    letterSpacing: 1,
    visibleFields: ["model", ...EXPOSURE],
  },

  // The photo floats on a blurred, darkened copy of itself
  frosted: {
    backgroundMode: "blur",
    backgroundColor: "#1A1A1A",
    backgroundBlur: 48,
    backgroundDim: 18,
    paddingTop: 44,
    paddingBottom: 10,
    paddingHorizontal: 44,
    borderRadius: 22,
    photoShadow: 55,
    showLogo: true,
    logoAuto: true,
    logoPosition: "center",
    fontFamily: "Outfit, sans-serif",
    fontColor: "#FFFFFF",
    secondaryColor: "#E2E2E2",
    fontSize: 14,
    modelFontSize: 24,
    visibleFields: ["model", ...EXPOSURE],
  },

  // Rounded photo lifted off a soft grey card, watermark bar beneath
  card: {
    backgroundColor: "#ECECEF",
    paddingTop: 48,
    paddingBottom: 6,
    paddingHorizontal: 48,
    borderRadius: 16,
    photoShadow: 35,
    captionStyle: "split",
    showLogo: true,
    logoAuto: true,
    fontFamily: "Inter, sans-serif",
    fontColor: "#1F1F23",
    secondaryColor: "#8A8A93",
    fontSize: 14,
    modelFontSize: 22,
    visibleFields: ["model", "lensModel", ...EXPOSURE, "dateTimeOriginal"],
  },

  // Letterbox: black bars, small widely-tracked monospace credits
  cinema: {
    backgroundColor: "#000000",
    paddingTop: 64,
    paddingBottom: 4,
    paddingHorizontal: 0,
    showLogo: false,
    logoPosition: "center",
    fontFamily: "'JetBrains Mono', monospace",
    fontColor: "#C8C8C8",
    secondaryColor: "#9A9A9A",
    fontSize: 12,
    letterSpacing: 4,
    visibleFields: ["model", ...EXPOSURE],
  },

  // Editorial: big spaced serif masthead, model / lens / date as the dek
  magazine: {
    backgroundColor: "#F3F1EC",
    paddingTop: 48,
    paddingBottom: 8,
    paddingHorizontal: 48,
    showLogo: true,
    logoPosition: "center",
    fontFamily: "'Playfair Display', serif",
    fontColor: "#141414",
    secondaryColor: "#6E6A63",
    fontSize: 13,
    modelFontSize: 40,
    letterSpacing: 2,
    visibleFields: ["model", "lensModel", "dateTimeOriginal"],
  },

  // ─── Retro ─────────────────────────────────────────────────────────────────

  // Instant print: thick bottom margin, the date hand-written on it
  polaroid: {
    backgroundColor: "#F6F4EE",
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 40,
    showLogo: false,
    logoPosition: "center",
    fontFamily: "'LXGW WenKai', serif",
    fontColor: "#3B3A36",
    secondaryColor: "#3B3A36",
    fontSize: 26,
    visibleFields: ["dateTimeOriginal"],
  },

  // Point-and-shoot print: no border, orange LCD date burnt into the corner
  datestamp: {
    backgroundColor: "#000000",
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    showLogo: false,
    visibleFields: [],
    dateStamp: true,
    dateStampColor: "#FF7A1A",
  },

  // Scanned negative strip: black rebate with amber edge code and frame data
  negative: {
    backgroundColor: "#121212",
    paddingTop: 52,
    paddingBottom: 4,
    paddingHorizontal: 28,
    showLogo: false,
    logoPosition: "left",
    fontFamily: "'IBM Plex Mono', monospace",
    fontColor: "#E39B3A",
    secondaryColor: "#E39B3A",
    fontSize: 12,
    letterSpacing: 3,
    edgeText: "KODAK PORTRA 400 · 24A",
    visibleFields: ["model", ...EXPOSURE],
  },
};

export function getResolvedConfig(
  templateId: string,
  overrides: Partial<TemplateConfig> = {},
): TemplateConfig {
  const preset = PRESET_TEMPLATES[templateId] || {};
  // Drop explicit `undefined` so a partial patch cannot wipe preset arrays
  // (e.g. visibleFields) — spreading `{ visibleFields: undefined }` would.
  const clean: Partial<TemplateConfig> = {};
  for (const [k, v] of Object.entries(overrides)) {
    if (v !== undefined) (clean as Record<string, unknown>)[k] = v;
  }
  return {
    ...DEFAULT_TEMPLATE_CONFIG,
    ...preset,
    ...clean,
  };
}
