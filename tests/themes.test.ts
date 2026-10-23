import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PALETTES, type ThemeId } from "../app/utils/themes";

// main.css (Tailwind) and themes.ts (Naive UI) both carry every palette; a
// drift would leave library controls in a different colour than the layout.
const css = readFileSync(new URL("../app/assets/css/main.css", import.meta.url), "utf8");

function cssPalette(id: ThemeId): string[] {
  // graphite is the default, declared in the @theme block
  const selector = id === "graphite" ? "@theme {" : `:root[data-theme="${id}"] {`;
  const start = css.indexOf(selector);
  expect(start, `no CSS block for ${id}`).toBeGreaterThanOrEqual(0);
  const block = css.slice(start, css.indexOf("}", start));
  const colors: string[] = [];
  for (const [, i, hex] of block.matchAll(/--color-nord-(\d+):\s*(#[0-9a-f]{6})/gi)) {
    colors[Number(i)] = hex!.toLowerCase();
  }
  return colors;
}

describe("theme palettes", () => {
  for (const id of Object.keys(PALETTES) as ThemeId[]) {
    it(`${id} matches main.css`, () => {
      expect(PALETTES[id].colors).toEqual(cssPalette(id));
    });
  }
});
