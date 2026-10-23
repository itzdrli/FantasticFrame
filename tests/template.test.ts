import { describe, it, expect } from "vitest";
import {
  DEFAULT_TEMPLATE_CONFIG,
  DEFAULT_TEMPLATE_ID,
  PRESET_LIST,
  PRESET_TEMPLATES,
  getResolvedConfig,
} from "../app/composables/useTemplate";
import { knownFamiliesIn } from "../shared/fonts";
import { validateTemplateConfig } from "../shared/validate";

describe("getResolvedConfig", () => {
  it("returns the default config for an unknown template id", () => {
    expect(getResolvedConfig("nope")).toEqual(DEFAULT_TEMPLATE_CONFIG);
  });

  it("merges DEFAULT + preset for known templates", () => {
    const cfg = getResolvedConfig("cinema");
    expect(cfg.backgroundColor).toBe("#000000");
    expect(cfg.fontFamily).toBe("'JetBrains Mono', monospace");
    // preset only overrides a few keys; the rest come from DEFAULT
    expect(cfg.paddingTop).toBe(64);
    expect(cfg.canvasMode).toBe("original");
    expect(cfg.borderRadius).toBe(0);
  });

  it("per-photo overrides win over the preset", () => {
    const cfg = getResolvedConfig("cinema", { backgroundColor: "#FF0000", fontSize: 30 });
    expect(cfg.backgroundColor).toBe("#FF0000");
    expect(cfg.fontSize).toBe(30);
    // untouched preset values survive
    expect(cfg.fontFamily).toBe("'JetBrains Mono', monospace");
  });

  it("undefined override keys do not wipe preset visibleFields", () => {
    const cfg = getResolvedConfig(DEFAULT_TEMPLATE_ID, {
      fontSize: 20,
      visibleFields: undefined,
    } as Partial<typeof DEFAULT_TEMPLATE_CONFIG>);
    expect(cfg.visibleFields.length).toBeGreaterThan(0);
    expect(cfg.fontSize).toBe(20);
  });

  it("overrides never leak into the preset or the default", () => {
    getResolvedConfig("leica", { backgroundColor: "#FF0000" });
    expect(PRESET_TEMPLATES.leica?.backgroundColor).toBe("#FFFFFF");
    expect(DEFAULT_TEMPLATE_CONFIG.backgroundColor).toBe("#FFFFFF");
  });

  it("every preset is listed, valid for the render API, and uses shipped fonts", () => {
    expect(PRESET_LIST.map((p) => p.id).sort()).toEqual(Object.keys(PRESET_TEMPLATES).sort());
    expect(PRESET_TEMPLATES[DEFAULT_TEMPLATE_ID]).toBeDefined();
    for (const id of Object.keys(PRESET_TEMPLATES)) {
      const cfg = getResolvedConfig(id);
      expect(validateTemplateConfig(cfg), id).toEqual({ valid: true });
      expect(Array.isArray(cfg.visibleFields)).toBe(true);
      expect(cfg.backgroundColor).toMatch(/^#/);
      // takumi renders an unregistered family in its default font
      expect(knownFamiliesIn(cfg.fontFamily).length, id).toBeGreaterThan(0);
    }
  });
});
