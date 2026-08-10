import { describe, it, expect } from "vitest";
import { validateTemplateConfig } from "../shared/validate";
import { estimateBase64Bytes } from "../server/utils/limits";

const fullConfig = {
  borderRadius: 14,
  backgroundColor: "#FFFFFF",
  backgroundGradient: "linear-gradient(...)",
  photoScale: 0.9,
  paddingTop: 40,
  paddingBottom: 40,
  paddingHorizontal: 40,
  showLogo: true,
  logoPosition: "center",
  logoText: "TEST",
  logoImageUrl: "data:image/png;base64,xxx",
  logoScale: 100,
  logoAspect: 2,
  infoLayout: "horizontal",
  visibleFields: ["model", "fNumber", "iso"],
  fontFamily: "Inter, sans-serif",
  fontSize: 16,
  fontColor: "#333333",
  modelFontSize: 26,
  canvasMode: "original",
  canvasWidth: 1080,
  socialPreset: "instagram",
  socialRatio: "4:5",
};

describe("validateTemplateConfig", () => {
  it("accepts a full resolved config", () => {
    expect(validateTemplateConfig(fullConfig)).toEqual({ valid: true });
  });

  it("accepts a partial config (optional fields may be absent)", () => {
    expect(validateTemplateConfig({ backgroundColor: "#fff", canvasMode: "social" })).toEqual({
      valid: true,
    });
  });

  it("rejects wrong types that would poison layout math", () => {
    // strings coerce silently, objects become NaN in Math.round
    expect(validateTemplateConfig({ ...fullConfig, paddingTop: "40" }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, paddingTop: {} }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, photoScale: Infinity }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, visibleFields: ["model", 42] }).valid).toBe(
      false,
    );
  });

  it("rejects unknown enum values", () => {
    expect(validateTemplateConfig({ ...fullConfig, canvasMode: "square" }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, infoLayout: "columns" }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, logoPosition: "top" }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, socialPreset: "facebook" }).valid).toBe(false);
  });

  it("rejects non-object configs", () => {
    expect(validateTemplateConfig(null).valid).toBe(false);
    expect(validateTemplateConfig(undefined).valid).toBe(false);
    expect(validateTemplateConfig([]).valid).toBe(false);
    expect(validateTemplateConfig("classic").valid).toBe(false);
  });
});

describe("estimateBase64Bytes", () => {
  it("estimates decoded size from a data URL (over-estimate is fine)", () => {
    expect(estimateBase64Bytes("data:image/png;base64,AAAA")).toBe(3);
    expect(estimateBase64Bytes("data:image/png;base64,AA==")).toBe(3);
  });

  it("handles bare base64 without a data URL prefix", () => {
    expect(estimateBase64Bytes("AAAA")).toBe(3);
  });
});
