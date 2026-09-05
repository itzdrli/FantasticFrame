import type { TemplateConfig } from "~/types";

/** Template + overrides that new photos inherit / "Apply to all" copies. Crop is never included. */
export interface PhotoStyle {
  templateId: string;
  templateOverrides?: Partial<TemplateConfig>;
}

export type SyncCategory = "logo" | "typography" | "border" | "canvas" | "template";

export const LOGO_KEYS: (keyof TemplateConfig)[] = [
  "showLogo",
  "logoPosition",
  "logoText",
  "logoImageUrl",
  "logoScale",
  "logoAspect",
];

export const TYPOGRAPHY_KEYS: (keyof TemplateConfig)[] = [
  "fontFamily",
  "fontSize",
  "fontColor",
  "modelFontSize",
  "infoLayout",
  "visibleFields",
];

export const BORDER_KEYS: (keyof TemplateConfig)[] = [
  "backgroundColor",
  "borderRadius",
  "paddingTop",
  "paddingBottom",
  "paddingHorizontal",
];

export const CANVAS_KEYS: (keyof TemplateConfig)[] = ["canvasMode", "socialRatio"];

/** Key groups per syncable category (display names live in i18n sync.categories.*) */
export interface SyncCategoryMeta {
  id: SyncCategory;
  keys: (keyof TemplateConfig)[];
}

export const SYNC_CATEGORIES: SyncCategoryMeta[] = [
  { id: "logo", keys: LOGO_KEYS },
  { id: "typography", keys: TYPOGRAPHY_KEYS },
  { id: "border", keys: BORDER_KEYS },
  { id: "canvas", keys: CANVAS_KEYS },
  { id: "template", keys: [] },
];

export const ALL_SYNC_CATEGORIES: SyncCategory[] = [
  "logo",
  "typography",
  "border",
  "canvas",
  "template",
];

export const DEFAULT_ACTIVE_CATEGORIES: SyncCategory[] = ["logo", "typography", "border", "canvas"];

/** Extract only the override properties matching selected categories. */
export function filterOverridesByCategories(
  overrides: Partial<TemplateConfig> | undefined,
  categories: SyncCategory[],
): Partial<TemplateConfig> {
  if (!overrides) return {};
  const allowedKeys = new Set<keyof TemplateConfig>();
  for (const cat of SYNC_CATEGORIES) {
    if (categories.includes(cat.id)) {
      for (const k of cat.keys) allowedKeys.add(k);
    }
  }

  const result: Partial<TemplateConfig> = {};
  for (const [key, value] of Object.entries(overrides)) {
    const k = key as keyof TemplateConfig;
    if (allowedKeys.has(k) && value !== undefined) {
      if (k === "visibleFields" && Array.isArray(value)) {
        result.visibleFields = [...value];
      } else {
        (result as Record<string, unknown>)[k] = value;
      }
    }
  }
  return result;
}

/** Shallow-clone overrides, copying `visibleFields` so later toggles don't leak across photos. */
export function cloneTemplateOverrides(
  overrides?: Partial<TemplateConfig>,
): Partial<TemplateConfig> | undefined {
  if (!overrides) return undefined;
  const next: Partial<TemplateConfig> = { ...overrides };
  if (overrides.visibleFields) next.visibleFields = [...overrides.visibleFields];
  return next;
}

export function clonePhotoStyle(style?: PhotoStyle | null): PhotoStyle | undefined {
  if (!style) return undefined;
  return {
    templateId: style.templateId,
    templateOverrides: cloneTemplateOverrides(style.templateOverrides),
  };
}

/**
 * Overrides a photo keeps when its template is switched, provided the photo
 * carries a user-added logo (uploaded/pasted image, SVG, or typed text).
 *
 * A logo is user-owned, so its content (logoText / logoImageUrl), its size
 * (logoScale + logoAspect / modelFontSize), and its on/off state survive the
 * switch — only `logoPosition` resets so the new template's placement wins.
 * Text logos keep their font size (`modelFontSize`) too, but their face and
 * color follow the template: they are shared with the EXIF text (fontColor /
 * fontFamily) and pinning them could leave invisible text on a template with
 * a contrasting background.
 *
 * Returns undefined when there is no custom logo — the classic
 * "switch clears every override" behavior. Template-level fallbacks (e.g. the
 * make-derived text logo) are not user logos and never trigger preservation.
 *
 * @param overrides  photo's current templateOverrides
 * @param oldResolved  resolved config before the switch (getResolvedConfig)
 * @param newResolved  resolved default of the target template (no preserved keys)
 */
export function preserveLogoOverridesOnTemplateSwitch(
  overrides: Partial<TemplateConfig> | undefined,
  oldResolved: TemplateConfig,
  newResolved: TemplateConfig,
): Partial<TemplateConfig> | undefined {
  if (!overrides?.logoText && !overrides?.logoImageUrl) return undefined;

  const next: Partial<TemplateConfig> = {};
  const nextAny = next as Record<string, unknown>;

  // Logo keys the user touched, minus position (the new template's own wins)
  for (const k of LOGO_KEYS) {
    if (k === "logoPosition") continue;
    const v = overrides[k];
    if (v !== undefined) nextAny[k] = v;
  }

  // modelFontSize sizes a text logo (and is the baseline for image-logo
  // Scale %), so a custom value is part of the logo, not of the template.
  if (overrides.modelFontSize !== undefined) next.modelFontSize = overrides.modelFontSize;

  // A logo the user chose to show must not silently vanish on a template whose
  // preset hides logos (e.g. minimal) — unless they explicitly turned it off.
  if (
    oldResolved.showLogo !== false &&
    newResolved.showLogo === false &&
    overrides.showLogo === undefined
  ) {
    next.showLogo = true;
  }

  // Keep the absolute logo size instead of reflowing to the new template's
  // modelFontSize default (which would resize text logos and rescale image
  // logos, since Scale % is relative to that baseline).
  if (
    overrides.modelFontSize === undefined &&
    (oldResolved.modelFontSize ?? 26) !== (newResolved.modelFontSize ?? 26)
  ) {
    next.modelFontSize = oldResolved.modelFontSize;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}

/**
 * Merge a patch into existing overrides.
 * Must not write `visibleFields: undefined` — spreading that into getResolvedConfig
 * wipes the preset's array and the preview crashes on `.map`.
 */
export function mergeTemplateOverrides(
  existing: Partial<TemplateConfig> | undefined,
  patch: Partial<TemplateConfig>,
): Partial<TemplateConfig> {
  const next: Partial<TemplateConfig> = { ...existing, ...patch };
  if (patch.visibleFields) {
    next.visibleFields = [...patch.visibleFields];
  } else if (existing?.visibleFields) {
    next.visibleFields = [...existing.visibleFields];
  } else {
    delete next.visibleFields;
  }
  return next;
}
