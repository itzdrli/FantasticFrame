import { describe, it, expect } from "vitest";
import { knownFamiliesIn, GOOGLE_FONTS } from "../shared/fonts";
import { loadExportFonts } from "../shared/fontLoader";

describe("knownFamiliesIn", () => {
  it("extracts shipped families from a CSS stack, in order", () => {
    expect(knownFamiliesIn("'Playfair Display', serif")).toEqual(["Playfair Display"]);
    expect(knownFamiliesIn("Inter, 'LXGW WenKai', sans-serif")).toEqual(["Inter", "LXGW WenKai"]);
  });
  it("ignores generics, unknown families and duplicates", () => {
    expect(knownFamiliesIn("Comic Sans, sans-serif")).toEqual([]);
    expect(knownFamiliesIn("Inter, Inter")).toEqual(["Inter"]);
    expect(knownFamiliesIn(undefined)).toEqual([]);
  });
  it("knows every family the template presets use", () => {
    expect(GOOGLE_FONTS.map((f) => f.name)).toContain("JetBrains Mono");
  });
});

describe("loadExportFonts", () => {
  const manifest = {
    families: {
      Inter: [
        {
          subset: "latin",
          file: "inter-latin-400.woff2",
          weight: 400,
          style: "normal",
          ranges: [[0, 255]],
        },
      ],
      "Noto Sans SC": [
        {
          subset: "s1",
          file: "noto-s1-400.woff2",
          weight: 400,
          style: "normal",
          ranges: [[0x4e00, 0x4eff]],
        },
      ],
    },
  };
  const calls: string[] = [];
  const fakeFetch = (async (url: string) => {
    calls.push(String(url));
    if (String(url).endsWith("manifest.json")) return Response.json(manifest);
    return new Response(new Uint8Array([1, 2, 3]));
  }) as unknown as typeof fetch;

  it("builds lazy, range-tagged loaders from our own origin only", async () => {
    const fonts = await loadExportFonts("Inter, sans-serif", {
      origin: "http://x",
      fetch: fakeFetch,
    });
    // Nothing but the manifest is downloaded until takumi asks for a face
    expect(calls).toEqual(["http://x/fonts/google/manifest.json"]);
    expect(fonts).toHaveLength(2); // Inter latin + CJK fallback slice
    const inter = fonts[0] as {
      subsetOf: string;
      ranges: number[][];
      data: () => Promise<Uint8Array>;
    };
    expect(inter.subsetOf).toBe("Inter");
    expect(inter.ranges).toEqual([[0, 255]]);
    await inter.data();
    expect(calls.at(-1)).toBe("http://x/fonts/google/inter-latin-400.woff2");
    expect(calls.every((c) => c.startsWith("http://x/"))).toBe(true);
  });
});
