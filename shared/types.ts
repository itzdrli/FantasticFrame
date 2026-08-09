/**
 * Canonical types shared by the browser (WASM) renderer, the server (native)
 * renderer, and the Vue app. App-only types (Photo, Template, …) live in
 * app/types/index.ts and re-export from here.
 */

/** EXIF field key used by visibleFields / formatExif */
export type ExifFieldKey =
  | "make"
  | "model"
  | "fNumber"
  | "exposureTime"
  | "iso"
  | "focalLength"
  | "dateTimeOriginal"
  | "lensModel"
  | "gps";

/** EXIF metadata extracted from a photo (or sent to the renderer) */
export interface ExifData {
  make?: string;
  model?: string;
  fNumber?: number;
  exposureTime?: number;
  exposureTimeFormatted?: string;
  iso?: number;
  focalLength?: number;
  focalLengthIn35mm?: number;
  /** Capture time — Date in the app, Date|string after JSON round-trip */
  dateTimeOriginal?: Date | string;
  lensModel?: string;
  latitude?: number;
  longitude?: number;
  exposureBias?: number;
  /** Raw exifr parse result (app-side only; ignored by the renderer) */
  raw?: Record<string, unknown>;
}

/** Template configurable options (1080px-base layout units) */
export interface TemplateConfig {
  backgroundColor: string;
  backgroundGradient?: string;
  borderRadius: number;
  photoScale: number;
  paddingTop: number;
  paddingBottom: number;
  paddingHorizontal: number;
  showLogo: boolean;
  logoPosition: "left" | "center" | "right";
  logoText?: string;
  logoImageUrl?: string;
  logoScale?: number;
  logoAspect?: number;
  /** @deprecated prefer logoScale + logoAspect */
  logoWidth?: number;
  /** @deprecated prefer logoScale + logoAspect */
  logoHeight?: number;
  infoLayout: "grid" | "list" | "horizontal";
  visibleFields: ExifFieldKey[] | string[];
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  modelFontSize: number;
  canvasMode: "original" | "fixed" | "social";
  canvasWidth?: number;
  canvasHeight?: number;
  socialPreset?: "instagram";
  /** Output aspect ratio (W:H), e.g. "1:1", "16:9", "7:5" */
  socialRatio?: string;
}

/** Per-photo crop/zoom applied inside the frame */
export interface PhotoCrop {
  fitMode: "contain" | "cover";
  scale: number;
  offsetX: number;
  offsetY: number;
}

export type ExportFormat = "png" | "jpeg" | "webp";

export interface ExportOptions {
  format: ExportFormat;
  quality: number;
}

/** Payload accepted by buildRenderTree / the render API */
export interface RenderPayload {
  photoBase64: string;
  exifData?: ExifData;
  templateConfig: TemplateConfig;
  exportOptions?: Partial<ExportOptions>;
  photoWidth?: number;
  photoHeight?: number;
  crop?: Partial<PhotoCrop>;
}

export interface RenderTreeResult {
  nodeTree: Record<string, any>;
  width: number;
  height: number;
  format: ExportFormat;
  quality: number;
}

/** Cover-crop geometry for a box */
export interface CropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Known social-canvas heights for a 1080-wide canvas.
 * Unknown "W:H" pairs are computed as round(1080 × H / W).
 */
export const SOCIAL_RATIO_HEIGHTS: Record<string, number> = {
  "1:1": 1080,
  "4:5": 1350,
  "5:4": 864,
  "3:4": 1440,
  "4:3": 810,
  "16:9": 608,
  "9:16": 1920,
  "21:9": 463,
  "9:21": 2520,
  "1.91:1": 565,
  "1:1.91": 2063,
};
