import { describe, it, expect } from "vitest";
import {
  DEFAULT_TEMPLATE_CONFIG,
  PRESET_TEMPLATES,
  useTemplate,
} from "../app/composables/useTemplate";

describe("useTemplate.getResolvedConfig", () => {
  const { getResolvedConfig } = useTemplate();

  it("returns the default config for an unknown template id", () => {
    expect(getResolvedConfig("nope")).toEqual(DEFAULT_TEMPLATE_CONFIG);
  });

  it("merges DEFAULT + preset for known templates", () => {
    const cfg = getResolvedConfig("dark");
    expect(cfg.backgroundColor).toBe("#18181B");
    expect(cfg.fontFamily).toBe("'JetBrains Mono', monospace");
    // preset only overrides a few keys; the rest come from DEFAULT
    expect(cfg.paddingTop).toBe(0);
    expect(cfg.canvasMode).toBe("original");
    expect(cfg.borderRadius).toBe(0);
  });

  it("per-photo overrides win over the preset", () => {
    const cfg = getResolvedConfig("dark", { backgroundColor: "#FF0000", fontSize: 30 });
    expect(cfg.backgroundColor).toBe("#FF0000");
    expect(cfg.fontSize).toBe(30);
    // untouched preset values survive
    expect(cfg.fontFamily).toBe("'JetBrains Mono', monospace");
  });

  it("overrides never leak into the preset or the default", () => {
    getResolvedConfig("classic", { backgroundColor: "#FF0000" });
    expect(PRESET_TEMPLATES.classic?.backgroundColor).toBe("#FFFFFF");
    expect(DEFAULT_TEMPLATE_CONFIG.backgroundColor).toBe("#FFFFFF");
  });

  it("all presets resolve without throwing and keep the required keys", () => {
    for (const id of Object.keys(PRESET_TEMPLATES)) {
      const cfg = getResolvedConfig(id);
      expect(cfg.canvasMode).toBe("original");
      expect(Array.isArray(cfg.visibleFields)).toBe(true);
      expect(cfg.visibleFields.length).toBeGreaterThan(0);
      expect(cfg.backgroundColor).toMatch(/^#/);
    }
  });
});
