import { describe, it, expect } from "vitest";
import {
  clonePhotoStyle,
  cloneTemplateOverrides,
  filterOverridesByCategories,
  mergeTemplateOverrides,
} from "../app/utils/photoStyle";

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
