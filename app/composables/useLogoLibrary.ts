import { reactive } from "vue";
import { getResolvedConfig } from "~/composables/useTemplate";
import { logoUrl, matchLogoId } from "~~/shared/logos";
import { applySvgColor, encodeSvgDataUrl, extractSvgAspect } from "~/utils/svgLogo";
import type { ExifData, Photo, TemplateConfig } from "~/types";

/**
 * Library SVG markup by id, filled in as the files arrive. Module-level and
 * reactive, so a preview that rendered the text fallback re-renders with the
 * logo once it has loaded.
 */
const svgs = reactive(new Map<string, string>());
const pending = new Map<string, Promise<string>>();

export function loadLibraryLogo(id: string): Promise<string> {
  const have = svgs.get(id);
  if (have) return Promise.resolve(have);
  let p = pending.get(id);
  if (!p) {
    p = fetch(logoUrl(id))
      .then((res) => {
        if (!res.ok) throw new Error(`logo ${id}: HTTP ${res.status}`);
        return res.text();
      })
      .then((svg) => {
        svgs.set(id, svg);
        return svg;
      });
    p.catch(() => pending.delete(id));
    pending.set(id, p);
  }
  return p;
}

// Recoloured data URLs, by logo + colour: one encode per combination, not per render
const encoded = new Map<string, { url: string; aspect: number }>();

/**
 * The config to draw: with `logoAuto`, the library logo for the photo's make
 * becomes the logo image, recoloured to the caption colour. A logo the user
 * set (image or text) always wins, and an unknown make keeps the text logo.
 */
export function withAutoLogo(cfg: TemplateConfig, exif?: ExifData): TemplateConfig {
  if (!cfg.logoAuto || cfg.logoImageUrl || cfg.logoText) return cfg;
  const id = matchLogoId(exif?.make, exif?.model);
  if (!id) return cfg;
  const svg = svgs.get(id);
  if (!svg) {
    loadLibraryLogo(id).catch(() => {});
    return cfg;
  }
  const key = `${id}|${cfg.fontColor}`;
  let logo = encoded.get(key);
  if (!logo) {
    logo = {
      url: encodeSvgDataUrl(applySvgColor(svg, cfg.fontColor)),
      aspect: extractSvgAspect(svg),
    };
    encoded.set(key, logo);
  }
  return { ...cfg, logoImageUrl: logo.url, logoAspect: logo.aspect };
}

/** A photo's template, resolved and with its auto logo applied */
export const renderConfigFor = (photo: Photo): TemplateConfig =>
  withAutoLogo(getResolvedConfig(photo.templateId, photo.templateOverrides), photo.exif);

/** Fetches every auto logo these photos need, so an export never falls back to text */
export async function prefetchAutoLogos(photos: readonly Photo[]): Promise<void> {
  const ids = new Set<string>();
  for (const p of photos) {
    if (!getResolvedConfig(p.templateId, p.templateOverrides).logoAuto) continue;
    const id = matchLogoId(p.exif.make, p.exif.model);
    if (id) ids.add(id);
  }
  await Promise.all([...ids].map((id) => loadLibraryLogo(id).catch(() => {})));
}
