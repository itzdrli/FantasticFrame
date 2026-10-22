import { describe, it, expect } from "vitest";
import { validateTemplateConfig } from "../shared/validate";
import { estimateBase64Bytes } from "../shared/limits";

const fullConfig = {
  borderRadius: 14,
  backgroundColor: "#FFFFFF",
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
    expect(validateTemplateConfig({ ...fullConfig, fontSize: Infinity }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, visibleFields: ["model", 42] }).valid).toBe(
      false,
    );
  });

  it("rejects unknown enum values", () => {
    expect(validateTemplateConfig({ ...fullConfig, canvasMode: "square" }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, infoLayout: "columns" }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, logoPosition: "top" }).valid).toBe(false);
  });

  it("rejects remote logo URLs (the renderer would fetch them: SSRF)", () => {
    for (const url of [
      "http://169.254.169.254/latest/meta-data",
      "https://example.com/logo.png",
      "file:///etc/passwd",
      "//evil.com/x.png",
    ]) {
      expect(validateTemplateConfig({ ...fullConfig, logoImageUrl: url }).valid).toBe(false);
    }
    expect(validateTemplateConfig({ ...fullConfig, logoImageUrl: "" }).valid).toBe(true);
    expect(
      validateTemplateConfig({ ...fullConfig, logoImageUrl: "data:image/svg+xml;base64,PHN2Zz4=" })
        .valid,
    ).toBe(true);
  });

  it("rejects absurd sizes and ratios that would blow up the canvas", () => {
    expect(validateTemplateConfig({ ...fullConfig, paddingTop: 1e9 }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, socialRatio: "1:99999" }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, socialRatio: "1.5:1" }).valid).toBe(false);
    expect(validateTemplateConfig({ ...fullConfig, fontFamily: "x".repeat(500) }).valid).toBe(
      false,
    );
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
