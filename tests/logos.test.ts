import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LOGO_LIBRARY, matchLogoId } from "../shared/logos";
import { validateTemplateConfig } from "../shared/validate";

const file = (id: string) => new URL(`../public/logos/${id}.svg`, import.meta.url);

describe("logo library", () => {
  it("ships a self-contained SVG for every entry", () => {
    for (const { id } of LOGO_LIBRARY) {
      expect(existsSync(file(id)), id).toBe(true);
      const svg = readFileSync(file(id), "utf8");
      expect(svg, id).toMatch(/^<svg[^>]*viewBox="[\d.\s-]+"/);
      // Embedded as a data URL and rasterized server-side: nothing may load or run
      expect(svg, id).not.toMatch(/<script|\son\w+=|href="(?!#)|url\((?!#)|<style/i);
    }
  });

  it("matches the Make strings cameras actually write", () => {
    const cases: [string, string | undefined, string | undefined][] = [
      ["Canon", "Canon EOS R5", "canon"],
      ["NIKON CORPORATION", "NIKON Z 6_2", "nikon"],
      ["SONY", "ILCE-7M4", "sony"],
      ["FUJIFILM", "X-T5", "fujifilm"],
      ["LEICA CAMERA AG", "LEICA Q3", "leica"],
      ["Panasonic", "DC-S5M2", "lumix"],
      ["OLYMPUS CORPORATION", "E-M1MarkIII", "olympus"],
      ["OM Digital Solutions", "OM-1", "olympus"],
      ["RICOH IMAGING COMPANY, LTD.", "RICOH GR III", "ricoh"],
      ["RICOH IMAGING COMPANY, LTD.", "PENTAX K-3 Mark III", "pentax"],
      ["Apple", "iPhone 17 Pro", "apple"],
      ["Xiaomi", "Xiaomi 15 Ultra", "xiaomi"],
      ["HUAWEI", "ALN-AL00", "huawei"],
      ["Mamiya", "RZ67", undefined],
      ["", undefined, undefined],
    ];
    for (const [make, model, id] of cases) expect(matchLogoId(make, model), make).toBe(id);
  });

  it("logoAuto is accepted by the render API", () => {
    expect(validateTemplateConfig({ logoAuto: true })).toEqual({ valid: true });
    expect(validateTemplateConfig({ logoAuto: "yes" }).valid).toBe(false);
  });
});
