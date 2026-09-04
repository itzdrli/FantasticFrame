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
  "logoWidth",
  "logoHeight",
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
  "backgroundGradient",
  "borderRadius",
  "photoScale",
  "paddingTop",
  "paddingBottom",
  "paddingHorizontal",
];

export const CANVAS_KEYS: (keyof TemplateConfig)[] = [
  "canvasMode",
  "canvasWidth",
  "canvasHeight",
  "socialPreset",
  "socialRatio",
];

export interface SyncCategoryMeta {
  id: SyncCategory;
  label: string;
  description: string;
  keys: (keyof TemplateConfig)[];
}

export const SYNC_CATEGORIES: SyncCategoryMeta[] = [
  {
    id: "logo",
    label: "Logo",
    description: "Image, text, scale, position",
    keys: LOGO_KEYS,
  },
  {
    id: "typography",
    label: "Typography",
    description: "Font family, size, color, visible fields",
    keys: TYPOGRAPHY_KEYS,
  },
  {
    id: "border",
    label: "Border & Background",
    description: "Background color, padding, radius, scale",
    keys: BORDER_KEYS,
  },
  {
    id: "canvas",
    label: "Aspect Ratio",
    description: "Canvas mode and aspect ratio",
    keys: CANVAS_KEYS,
  },
  {
    id: "template",
    label: "Template",
    description: "Base template preset",
    keys: [],
  },
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
