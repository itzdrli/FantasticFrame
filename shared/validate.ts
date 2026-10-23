/**
 * Hand-rolled templateConfig validation, shared so the server can reject
 * malformed configs with a clear 400 instead of a 500 leaking internals.
 * JSON can't carry NaN/Infinity, but wrong types can (e.g. `paddingTop: "40"`
 * coerces to 0, `paddingTop: {}` becomes NaN and poisons every layout calc),
 * so every field is type-checked. Optional fields may be absent.
 */

const CANVAS_MODES = ["original", "social"] as const;
const INFO_LAYOUTS = ["grid", "list", "horizontal"] as const;
const LOGO_POSITIONS = ["left", "center", "right"] as const;
const BACKGROUND_MODES = ["solid", "blur"] as const;
const CAPTION_STYLES = ["stack", "split"] as const;

const STRING_FIELDS = [
  "backgroundColor",
  "logoText",
  "logoImageUrl",
  "fontFamily",
  "fontColor",
  "socialRatio",
  "secondaryColor",
  "dateStampColor",
  "edgeText",
] as const;

const NUMERIC_FIELDS = [
  "borderRadius",
  "paddingTop",
  "paddingBottom",
  "paddingHorizontal",
  "fontSize",
  "modelFontSize",
  "logoScale",
  "logoAspect",
] as const;

const BOOLEAN_FIELDS = ["showLogo", "dateStamp", "logoAuto"] as const;

/**
 * Effect fields get tight ranges: a blur radius in the thousands would make
 * the server rasterize an enormous filter kernel.
 */
const BOUNDED_FIELDS: Record<string, [number, number]> = {
  backgroundBlur: [0, 200],
  backgroundDim: [0, 90],
  photoShadow: [0, 100],
  letterSpacing: [-10, 50],
};

const MAX_STRING_LEN = 200;
/** Generous bound on any layout number (px at the 1080 base, or a percentage) */
const MAX_LAYOUT_VALUE = 5000;
const MAX_LOGO_DATA_URL_CHARS = 3 * 1024 * 1024;
const SOCIAL_RATIO_RE = /^\d{1,2}:\d{1,2}$/;

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
    else if (f !== "logoImageUrl" && v.length > MAX_STRING_LEN) {
      errors.push(`${f} must be at most ${MAX_STRING_LEN} characters`);
    }
  }
  for (const f of NUMERIC_FIELDS) {
    const v = cfg[f];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v)) errors.push(`${f} must be a finite number`);
    else if (Math.abs(v) > MAX_LAYOUT_VALUE) errors.push(`${f} is out of range`);
  }

  for (const [f, [min, max]] of Object.entries(BOUNDED_FIELDS)) {
    const v = cfg[f];
    if (v === undefined) continue;
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max) {
      errors.push(`${f} must be a number between ${min} and ${max}`);
    }
  }

  // The renderer fetches any http(s) image src itself, so a remote logo URL
  // would let a caller make the server request arbitrary addresses (SSRF).
  // The app only ever produces data URLs (uploaded / pasted logos).
  const logo = cfg.logoImageUrl;
  if (typeof logo === "string" && logo !== "") {
    if (!logo.startsWith("data:image/")) errors.push("logoImageUrl must be an image data URL");
    else if (logo.length > MAX_LOGO_DATA_URL_CHARS) errors.push("logoImageUrl is too large");
  }
  const ratio = cfg.socialRatio;
  if (typeof ratio === "string" && ratio !== "" && !SOCIAL_RATIO_RE.test(ratio)) {
    errors.push("socialRatio must look like 4:5");
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
  inList(BACKGROUND_MODES)(cfg.backgroundMode, "backgroundMode");
  inList(CAPTION_STYLES)(cfg.captionStyle, "captionStyle");

  const vf = cfg.visibleFields;
  if (vf !== undefined) {
    if (!Array.isArray(vf) || vf.length > 20 || vf.some((f) => typeof f !== "string")) {
      errors.push("visibleFields must be an array of at most 20 strings");
    }
  }

  return errors.length ? { valid: false, errors } : { valid: true };
}
