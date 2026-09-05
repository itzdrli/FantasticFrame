import { describe, it, expect } from "vitest";
import {
  clonePhotoStyle,
  cloneTemplateOverrides,
  filterOverridesByCategories,
  mergeTemplateOverrides,
  preserveLogoOverridesOnTemplateSwitch,
} from "../app/utils/photoStyle";
import type { TemplateConfig } from "../app/types";

describe("cloneTemplateOverrides", () => {
  it("returns undefined when there is nothing to clone", () => {
    expect(cloneTemplateOverrides(undefined)).toBeUndefined();
  });

  it("copies scalar fields without sharing the object", () => {
    const src = { fontSize: 18, logoScale: 120 };
    const cloned = cloneTemplateOverrides(src);
    expect(cloned).toEqual(src);
    expect(cloned).not.toBe(src);
    cloned!.fontSize = 30;
    expect(src.fontSize).toBe(18);
  });

  it("copies visibleFields so later toggles do not leak", () => {
    const src = { visibleFields: ["model", "iso"] };
    const cloned = cloneTemplateOverrides(src);
    cloned!.visibleFields!.push("make");
    expect(src.visibleFields).toEqual(["model", "iso"]);
  });

  it("does not insert a visibleFields key when the source omitted it", () => {
    const cloned = cloneTemplateOverrides({ fontSize: 16 });
    expect(cloned).toEqual({ fontSize: 16 });
    expect("visibleFields" in (cloned ?? {})).toBe(false);
  });
});

describe("mergeTemplateOverrides", () => {
  it("does not write visibleFields when neither side has it", () => {
    const merged = mergeTemplateOverrides(undefined, { fontSize: 18, logoScale: 80 });
    expect(merged).toEqual({ fontSize: 18, logoScale: 80 });
    expect("visibleFields" in merged).toBe(false);
  });

  it("keeps the existing visibleFields when the patch omits them", () => {
    const merged = mergeTemplateOverrides(
      { visibleFields: ["model", "iso"], fontSize: 14 },
      { fontSize: 20 },
    );
    expect(merged.visibleFields).toEqual(["model", "iso"]);
    expect(merged.fontSize).toBe(20);
  });

  it("clones a visibleFields patch so later toggles do not leak", () => {
    const patch = { visibleFields: ["model"] };
    const merged = mergeTemplateOverrides({ fontSize: 16 }, patch);
    merged.visibleFields!.push("iso");
    expect(patch.visibleFields).toEqual(["model"]);
  });
});

describe("filterOverridesByCategories", () => {
  it("returns empty object for empty or undefined overrides", () => {
    expect(filterOverridesByCategories(undefined, ["logo"])).toEqual({});
    expect(filterOverridesByCategories({}, ["logo"])).toEqual({});
  });

  it("filters only keys belonging to the requested category", () => {
    const mixed = {
      logoScale: 120,
      logoText: "Nikon",
      fontSize: 16,
      backgroundColor: "#fff",
      paddingTop: 50,
      canvasMode: "social" as const,
    };

    const logoOnly = filterOverridesByCategories(mixed, ["logo"]);
    expect(logoOnly).toEqual({ logoScale: 120, logoText: "Nikon" });

    const typeOnly = filterOverridesByCategories(mixed, ["typography"]);
    expect(typeOnly).toEqual({ fontSize: 16 });

    const borderOnly = filterOverridesByCategories(mixed, ["border"]);
    expect(borderOnly).toEqual({ backgroundColor: "#fff", paddingTop: 50 });

    const canvasOnly = filterOverridesByCategories(mixed, ["canvas"]);
    expect(canvasOnly).toEqual({ canvasMode: "social" });
  });

  it("combines multiple categories when selected", () => {
    const mixed = {
      logoScale: 100,
      fontSize: 18,
      paddingTop: 30,
    };
    const result = filterOverridesByCategories(mixed, ["logo", "typography"]);
    expect(result).toEqual({ logoScale: 100, fontSize: 18 });
  });

  it("deep clones visibleFields when present", () => {
    const mixed = {
      visibleFields: ["model", "iso"],
      fontSize: 14,
    };
    const result = filterOverridesByCategories(mixed, ["typography"]);
    expect(result.visibleFields).toEqual(["model", "iso"]);
    expect(result.visibleFields).not.toBe(mixed.visibleFields);
  });
});

describe("clonePhotoStyle", () => {
  it("returns undefined for a missing source (first import)", () => {
    expect(clonePhotoStyle(undefined)).toBeUndefined();
    expect(clonePhotoStyle(null)).toBeUndefined();
  });

  it("inherits templateId and cloned overrides", () => {
    const src = {
      templateId: "dark",
      templateOverrides: { logoImageUrl: "data:image/png;base64,xx", logoScale: 80 },
    };
    const cloned = clonePhotoStyle(src);
    expect(cloned?.templateId).toBe("dark");
    expect(cloned?.templateOverrides).toEqual(src.templateOverrides);
    expect(cloned?.templateOverrides).not.toBe(src.templateOverrides);
  });
});

describe("preserveLogoOverridesOnTemplateSwitch", () => {
  // Only showLogo / modelFontSize are read off the resolved configs
  const resolved = (c: Partial<TemplateConfig>) => c as TemplateConfig;
  const classic = resolved({ showLogo: true, modelFontSize: 24 });
  const dark = resolved({ showLogo: true, modelFontSize: 22 });
  const minimal = resolved({ showLogo: false, modelFontSize: 20 });

  it("keeps the legacy full reset when the photo has no custom logo", () => {
    expect(
      preserveLogoOverridesOnTemplateSwitch(
        { fontColor: "#fff", logoPosition: "right" },
        classic,
        dark,
      ),
    ).toBeUndefined();
    expect(preserveLogoOverridesOnTemplateSwitch(undefined, classic, dark)).toBeUndefined();
  });

  it("keeps an image logo (content, aspect, scale) but drops position and non-logo keys", () => {
    const result = preserveLogoOverridesOnTemplateSwitch(
      {
        logoImageUrl: "data:image/png;base64,xx",
        logoAspect: 2,
        logoScale: 120,
        logoPosition: "right",
        fontColor: "#fff",
      },
      classic,
      dark,
    );
    expect(result).toEqual({
      logoImageUrl: "data:image/png;base64,xx",
      logoAspect: 2,
      logoScale: 120,
      // pin the old size baseline so the absolute logo size survives
      modelFontSize: 24,
    });
    expect("logoPosition" in (result ?? {})).toBe(false);
  });

  it("keeps a text logo's content and its explicit font size", () => {
    const result = preserveLogoOverridesOnTemplateSwitch(
      { logoText: "Atelier", modelFontSize: 40, fontSize: 18 },
      classic,
      dark,
    );
    expect(result).toEqual({ logoText: "Atelier", modelFontSize: 40 });
  });

  it("pins visibility so a shown logo survives a hide-logo template (e.g. minimal)", () => {
    const result = preserveLogoOverridesOnTemplateSwitch(
      { logoImageUrl: "data:image/png;base64,xx" },
      classic,
      minimal,
    );
    expect(result?.showLogo).toBe(true);
  });

  it("keeps an explicit showLogo=false override (user hid the logo)", () => {
    const result = preserveLogoOverridesOnTemplateSwitch(
      { logoImageUrl: "data:image/png;base64,xx", showLogo: false },
      classic,
      minimal,
    );
    expect(result?.showLogo).toBe(false);
  });

  it("does not force showLogo when the old template already hid it", () => {
    const result = preserveLogoOverridesOnTemplateSwitch(
      { logoText: "hidden but typed" },
      minimal,
      dark,
    );
    expect("showLogo" in (result ?? {})).toBe(false);
  });

  it("does not pin modelFontSize when old and new template agree on it", () => {
    const result = preserveLogoOverridesOnTemplateSwitch(
      { logoImageUrl: "data:image/png;base64,xx" },
      classic,
      resolved({ showLogo: true, modelFontSize: 24 }),
    );
    expect("modelFontSize" in (result ?? {})).toBe(false);
  });

  it("keeps an explicit showLogo=true override even when the template hides logos", () => {
    const result = preserveLogoOverridesOnTemplateSwitch(
      { logoImageUrl: "data:image/png;base64,xx", showLogo: true },
      classic,
      minimal,
    );
    expect(result?.showLogo).toBe(true);
  });
});
