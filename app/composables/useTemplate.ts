import type { TemplateConfig } from "~/types";

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  borderWidth: 0,
  borderColor: "#FFFFFF",
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

export const PRESET_TEMPLATES: Record<string, Partial<TemplateConfig>> = {
  // ─── Classic ───────────────────────────────────────────────────────────────
  // White background, even whitespace around the photo, model + settings centered at the bottom, clean layout
  classic: {
    backgroundColor: "#FFFFFF",
    photoScale: 1.0,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    borderWidth: 0,
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
  // Dark gray background, borderless full-bleed photo, model (left) and settings (right) at the bottom
  dark: {
    backgroundColor: "#1C1C1E",
    photoScale: 1.0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    borderRadius: 0,
    showLogo: true,
    logoPosition: "left",
    fontFamily: "Inter, sans-serif",
    fontColor: "#E5E5EA",
    fontSize: 15,
    modelFontSize: 22,
    infoLayout: "horizontal",
    visibleFields: ["model", "fNumber", "exposureTime", "iso"],
  },

  // ─── Minimal ───────────────────────────────────────────────────────────────
  // Near-white background, full-bleed photo, only the capture date in a small serif font at the bottom, no logo
  minimal: {
    backgroundColor: "#F8F8F6",
    photoScale: 1.0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    borderRadius: 0,
    showLogo: false,
    fontFamily: "'Georgia', serif",
    fontColor: "#6B6B6B",
    fontSize: 14,
    modelFontSize: 20,
    infoLayout: "horizontal",
    visibleFields: ["model", "dateTimeOriginal"],
  },

  // ─── Film style ────────────────────────────────────────────────────────────
  // Pure black background, photo embedded in a thick black border, model left-aligned at the bottom with settings on the right, vintage warm-toned font
  "film-style": {
    backgroundColor: "#0D0D0D",
    photoScale: 1.0,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 0,
    borderRadius: 0,
    showLogo: true,
    logoPosition: "left",
    fontFamily: "'Georgia', serif",
    fontColor: "#D4C5A0",
    fontSize: 15,
    modelFontSize: 22,
    infoLayout: "horizontal",
    visibleFields: ["make", "model", "fNumber", "exposureTime", "iso"],
  },

  // ─── Card style ────────────────────────────────────────────────────────────
  // Light gray background, large rounded corners on the photo (Polaroid-like), brand + settings centered at the bottom
  "card-style": {
    backgroundColor: "#F0F0F0",
    photoScale: 1.0,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderWidth: 0,
    borderRadius: 12,
    showLogo: true,
    logoPosition: "center",
    fontFamily: "Inter, sans-serif",
    fontColor: "#2C2C2E",
    fontSize: 14,
    modelFontSize: 22,
    infoLayout: "horizontal",
    visibleFields: ["model", "fNumber", "exposureTime", "iso"],
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
