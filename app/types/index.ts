/**
 * FantasticFrame — Core type definitions
 */

// ==================== EXIF ====================

/** EXIF metadata extracted from a photo */
export interface ExifData {
  /** Camera make, e.g. "Canon", "Sony" */
  make?: string;
  /** Camera model, e.g. "EOS R5", "A7M4" */
  model?: string;
  /** Aperture value, e.g. 2.8 */
  fNumber?: number;
  /** Shutter speed (seconds), e.g. 0.004 → 1/250 */
  exposureTime?: number;
  /** Formatted shutter speed string, e.g. "1/250" */
  exposureTimeFormatted?: string;
  /** ISO sensitivity, e.g. 100, 800 */
  iso?: number;
  /** Focal length (mm), e.g. 50 */
  focalLength?: number;
  /** 35mm equivalent focal length, e.g. 75 */
  focalLengthIn35mm?: number;
  /** Capture time */
  dateTimeOriginal?: Date;
  /** Lens model, e.g. "RF 50mm F1.2L USM" */
  lensModel?: string;
  /** GPS latitude */
  latitude?: number;
  /** GPS longitude */
  longitude?: number;
  /** Exposure compensation, e.g. -0.3, +1.0 */
  exposureBias?: number;
  /** Raw EXIF object (exifr parse result) */
  raw?: Record<string, unknown>;
}

// ==================== Photo ====================

/** Full state of a single photo */
export interface Photo {
  /** Unique ID */
  id: string;
  /** Original file name */
  fileName: string;
  /** Original file size (bytes) */
  fileSize: number;
  /** MIME type */
  mimeType: string;
  /** Original image Base64 Data URL */
  dataUrl: string;
  /** Original image width (px) */
  width: number;
  /** Original image height (px) */
  height: number;
  /** Extracted EXIF data */
  exif: ExifData;
  /** Currently applied template ID */
  templateId: string;
  /** Overrides for the current template config */
  templateOverrides?: Partial<TemplateConfig>;
  /** Time added */
  addedAt: Date;
}

// ==================== Template system ====================

/** Border template definition */
export interface Template {
  /** Unique template ID */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Thumbnail path */
  thumbnail?: string;
  /** Default config */
  defaultConfig: TemplateConfig;
}

/** Template configurable options */
export interface TemplateConfig {
  // —— Border ——
  /** Border thickness (px) */
  borderWidth: number;
  /** Border color */
  borderColor: string;
  /** Border radius (px) */
  borderRadius: number;

  // —— Background ——
  /** Background color */
  backgroundColor: string;
  /** Background gradient (CSS gradient string, empty means not used) */
  backgroundGradient?: string;

  // —— Photo & border ratio ——
  /** Photo scale within the canvas (0-1) */
  photoScale: number;
  /** Padding above the photo (px) */
  paddingTop: number;
  /** Padding below the photo (px) */
  paddingBottom: number;
  /** Left/right padding of the photo (px) */
  paddingHorizontal: number;

  // —— Brand logo ——
  /** Whether to show the brand logo */
  showLogo: boolean;
  /** Logo position */
  logoPosition: "left" | "center" | "right";
  /** Custom logo text (falls back to camera make when empty) */
  logoText?: string;
  /** Custom logo image Data URL (takes precedence over text logo) */
  logoImageUrl?: string;
  /** Logo image width (1080-based px, defaults to model font size × 5) */
  logoWidth?: number;
  /** Logo image height (1080-based px, defaults to model font size × 1.4) */
  logoHeight?: number;

  // —— Parameter layout ——
  /** EXIF row layout mode */
  infoLayout: "grid" | "list" | "horizontal";
  /** Which EXIF fields to show */
  visibleFields: ExifFieldKey[];

  // —— Font ——
  /** Font family */
  fontFamily: string;
  /** Parameter font size (px) */
  fontSize: number;
  /** Font color */
  fontColor: string;
  /** Model name font size (px) */
  modelFontSize: number;

  // —— Canvas ——
  /** Output canvas ratio mode */
  canvasMode: "original" | "fixed" | "social";
  /** Fixed ratio width (used when canvasMode='fixed') */
  canvasWidth?: number;
  /** Fixed ratio height (used when canvasMode='fixed') */
  canvasHeight?: number;
  /** Social platform preset (used when canvasMode='social') */
  socialPreset?: "instagram" | "xiaohongshu" | "wechat" | "weibo";
  /** Instagram ratio (used when socialPreset='instagram') */
  socialRatio?: "1:1" | "4:5" | "3:4" | "1.91:1" | "5:4" | "4:3" | "1:1.91";
}

/** EXIF field key, used to configure visibility */
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

// ==================== Export ====================

/** Export format */
export type ExportFormat = "png" | "jpeg" | "webp";

/** Export options (JPEG/WebP quality 0-100) */
export interface ExportOptions {
  format: ExportFormat;
  quality: number;
}

// ==================== Render request ====================

/** Request body sent to server/api/render */
export interface RenderRequest {
  /** Photo Base64 */
  photoBase64: string;
  /** EXIF data */
  exifData: ExifData;
  /** Template ID */
  templateId: string;
  /** Template config */
  templateConfig: TemplateConfig;
  /** Export options */
  exportOptions: ExportOptions;
}

/** Render result */
export interface RenderResponse {
  /** Base64 of the rendered image */
  imageBase64: string;
  /** MIME type */
  mimeType: string;
  /** Rendered dimensions */
  width: number;
  height: number;
}
