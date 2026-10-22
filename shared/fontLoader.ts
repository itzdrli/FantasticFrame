import type { FontLoader } from "takumi-js";
import {
  CJK_FALLBACK_FAMILY,
  GOOGLE_FONT_BASE,
  LXGW_FAMILY,
  LXGW_FONT_PATH,
  knownFamiliesIn,
} from "./fonts";

interface FontFace {
  subset: string;
  file: string;
  weight: number;
  style: string;
  ranges: [number, number][];
}

type Manifest = { families: Record<string, FontFace[]> };

export interface FontEnv {
  /** Origin the font files are fetched from ("" in the browser) */
  origin: string;
  fetch?: typeof fetch;
}

const manifests = new Map<string, Promise<Manifest>>();

function loadManifest(env: FontEnv): Promise<Manifest> {
  const url = `${env.origin}${GOOGLE_FONT_BASE}/manifest.json`;
  let p = manifests.get(url);
  if (!p) {
    p = (env.fetch ?? fetch)(url).then((res) => {
      if (!res.ok) throw new Error(`font manifest: HTTP ${res.status}`);
      return res.json() as Promise<Manifest>;
    });
    p.catch(() => manifests.delete(url));
    manifests.set(url, p);
  }
  return p;
}

/**
 * Fonts takumi needs to draw text set in `fontFamily`: the families we ship
 * that the CSS stack names, plus a CJK fallback. Google families are split
 * into unicode-range slices with lazy `data()` loaders, so takumi only
 * downloads the slices whose codepoints actually appear in the tree.
 * Everything comes from our own origin.
 */
export async function loadExportFonts(
  fontFamily: string | undefined,
  env: FontEnv,
): Promise<FontLoader[]> {
  const families = knownFamiliesIn(fontFamily);
  if (!families.includes(CJK_FALLBACK_FAMILY)) families.push(CJK_FALLBACK_FAMILY);

  const doFetch = env.fetch ?? fetch;
  const manifest = await loadManifest(env);
  const out: FontLoader[] = [];

  for (const family of families) {
    if (family === LXGW_FAMILY) {
      out.push(`${env.origin}${LXGW_FONT_PATH}`);
      continue;
    }
    for (const face of manifest.families[family] ?? []) {
      const url = `${env.origin}${GOOGLE_FONT_BASE}/${face.file}`;
      out.push({
        name: `${family} ${face.subset}`,
        key: `${family}:${face.subset}:${face.weight}`,
        subsetOf: family,
        weight: face.weight,
        style: face.style,
        ranges: face.ranges,
        data: async () => {
          const res = await doFetch(url);
          if (!res.ok) throw new Error(`font ${face.file}: HTTP ${res.status}`);
          return new Uint8Array(await res.arrayBuffer());
        },
      });
    }
  }
  return out;
}
