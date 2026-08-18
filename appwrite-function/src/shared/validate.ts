/**
 * Hand-rolled templateConfig validation, shared so the server can reject
 * malformed configs with a clear 400 instead of a 500 leaking internals.
 * JSON can't carry NaN/Infinity, but wrong types can (e.g. `paddingTop: "40"`
 * coerces to 0, `paddingTop: {}` becomes NaN and poisons every layout calc),
 * so every field is type-checked. Optional fields may be absent.
 */

const CANVAS_MODES = ["original", "fixed", "social"] as const;
const INFO_LAYOUTS = ["grid", "list", "horizontal"] as const;
const LOGO_POSITIONS = ["left", "center", "right"] as const;
const SOCIAL_PRESETS = ["instagram"] as const;

const STRING_FIELDS = [
  "backgroundColor",
  "backgroundGradient",
  "logoText",
  "logoImageUrl",
  "fontFamily",
  "fontColor",
  "socialRatio",
] as const;

const NUMERIC_FIELDS = [
  "borderRadius",
  "photoScale",
  "paddingTop",
  "paddingBottom",
  "paddingHorizontal",
  "fontSize",
  "modelFontSize",
  "canvasWidth",
  "canvasHeight",
  "logoScale",
  "logoAspect",
  "logoWidth",
  "logoHeight",
] as const;

const BOOLEAN_FIELDS = ["showLogo"] as const;

export type ValidationResult = { valid: true } | { valid: false; errors: string[] };

export function validateTemplateConfig(value: unknown): ValidationResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { valid: false, errors: ["templateConfig must be an object"] };
  }
  const cfg = value as Record<string, unknown>;
  const errors: string[] = [];

  for (const f of STRING_FIELDS) {
    const v = cfg[f];
    if (v === undefined) continue;
    if (typeof v !== "string") errors.push(`${f} must be a string`);
  }
  for (const f of NUMERIC_FIELDS) {
    const v = cfg[f];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v)) errors.push(`${f} must be a finite number`);
  }
  for (const f of BOOLEAN_FIELDS) {
    const v = cfg[f];
    if (v === undefined) continue;
    if (typeof v !== "boolean") errors.push(`${f} must be a boolean`);
  }

  const inList = (list: readonly string[]) => (v: unknown, label: string) => {
    if (v === undefined) return;
    if (!list.includes(v as string)) errors.push(`${label} must be one of: ${list.join("|")}`);
  };
  inList(CANVAS_MODES)(cfg.canvasMode, "canvasMode");
  inList(INFO_LAYOUTS)(cfg.infoLayout, "infoLayout");
  inList(LOGO_POSITIONS)(cfg.logoPosition, "logoPosition");
  inList(SOCIAL_PRESETS)(cfg.socialPreset, "socialPreset");

  const vf = cfg.visibleFields;
  if (vf !== undefined) {
    if (!Array.isArray(vf) || vf.some((f) => typeof f !== "string")) {
      errors.push("visibleFields must be an array of strings");
    }
  }

  return errors.length ? { valid: false, errors } : { valid: true };
}
