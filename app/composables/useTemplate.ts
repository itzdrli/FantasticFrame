import type { TemplateConfig } from "~/types";

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  borderRadius: 0,
  backgroundColor: "#FFFFFF",
  photoScale: 1.0,
  paddingTop: 40,
  paddingBottom: 40,
  paddingHorizontal: 40,
  showLogo: true,
  logoPosition: "center",
  logoText: "",
  infoLayout: "horizontal",
  visibleFields: ["model", "fNumber", "exposureTime", "iso", "focalLength"],
  fontFamily: "Inter, sans-serif",
  fontSize: 16,
  fontColor: "#333333",
  modelFontSize: 26,
  canvasMode: "original",
};

// Nord color palette (https://www.nordtheme.org/) — kept here for reference:
//   polar night:  nord0 #2E3440 · nord1 #3B4252 · nord2 #434C5E · nord3 #4C566A
//   snow storm:   nord4 #D8DEE9 · nord5 #E5E9F0 · nord6 #ECEFF4
//   frost:        nord7 #8FBCBB · nord8 #88C0D0 · nord9 #81A1C1 · nord10 #5E81AC
//   aurora:       nord11 #BF616A · nord12 #D08770 · nord13 #EBCB8B · nord14 #A3BE8C · nord15 #B48EAD

export const PRESET_TEMPLATES: Record<string, Partial<TemplateConfig>> = {
  // ─── Classic ───────────────────────────────────────────────────────────────
  // Pure white museum mat — even breathing room, centered model + full specs row
  classic: {
    backgroundColor: "#FFFFFF",
    photoScale: 1.0,
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 32,
    borderRadius: 0,
    showLogo: true,
    logoPosition: "center",
    fontFamily: "Inter, sans-serif",
    fontColor: "#1A1A1A",
    fontSize: 15,
    modelFontSize: 24,
    infoLayout: "horizontal",
    visibleFields: ["model", "fNumber", "exposureTime", "iso", "focalLength"],
  },

  // ─── Dark ──────────────────────────────────────────────────────────────────
  // Cinematic near-black, borderless full-bleed, monospace spec readout, model left
  dark: {
    backgroundColor: "#18181B",
    photoScale: 1.0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
    showLogo: true,
    logoPosition: "left",
    fontFamily: "'JetBrains Mono', monospace",
    fontColor: "#E8E8EC",
    fontSize: 14,
    modelFontSize: 22,
    infoLayout: "horizontal",
    visibleFields: ["model", "fNumber", "exposureTime", "iso", "focalLength"],
  },

  // ─── Minimal ───────────────────────────────────────────────────────────────
  // Quiet gallery off-white, only model + capture date in muted neutral sans
  minimal: {
    backgroundColor: "#F5F5F3",
    photoScale: 1.0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
    showLogo: false,
    fontFamily: "'Source Sans 3', sans-serif",
    fontColor: "#8A8A85",
    fontSize: 14,
    modelFontSize: 20,
    infoLayout: "horizontal",
    visibleFields: ["model", "dateTimeOriginal"],
  },

  // ─── Film style ────────────────────────────────────────────────────────────
  // Pure-black celluloid frame, warm cream serif (Playfair), make + model + key specs
  "film-style": {
    backgroundColor: "#0A0A0A",
    photoScale: 1.0,
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 18,
    borderRadius: 0,
    showLogo: true,
    logoPosition: "left",
    fontFamily: "'Playfair Display', serif",
    fontColor: "#D9C7A3",
    fontSize: 15,
    modelFontSize: 24,
    infoLayout: "horizontal",
    visibleFields: ["model", "fNumber", "exposureTime", "iso"],
  },

  // ─── Card style ────────────────────────────────────────────────────────────
  // Warm paper surface, large rounded photo (Polaroid-like), brand + specs centered
  "card-style": {
    backgroundColor: "#EFEDEC",
    photoScale: 1.0,
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    borderRadius: 14,
    showLogo: true,
    logoPosition: "center",
    fontFamily: "'Source Sans 3', sans-serif",
    fontColor: "#2A2A2E",
    fontSize: 14,
    modelFontSize: 22,
    infoLayout: "horizontal",
    visibleFields: ["model", "fNumber", "exposureTime", "iso", "focalLength"],
  },

  // ─── Nord Dark ──────────────────────────────────────────────────────────────
  // Polar-night surface (nord0) with snow-storm ink (nord4), monospace terminal-luxe
  nord: {
    backgroundColor: "#2E3440",
    photoScale: 1.0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
    showLogo: true,
    logoPosition: "left",
    fontFamily: "'JetBrains Mono', monospace",
    fontColor: "#D8DEE9",
    fontSize: 14,
    modelFontSize: 22,
    infoLayout: "horizontal",
    visibleFields: ["model", "fNumber", "exposureTime", "iso", "focalLength"],
  },
};

export function useTemplate() {
  const getResolvedConfig = (
    templateId: string,
    overrides: Partial<TemplateConfig> = {},
  ): TemplateConfig => {
    const preset = PRESET_TEMPLATES[templateId] || {};
    return {
      ...DEFAULT_TEMPLATE_CONFIG,
      ...preset,
      ...overrides,
    };
  };

  return {
    getResolvedConfig,
    PRESET_TEMPLATES,
    DEFAULT_TEMPLATE_CONFIG,
  };
}
