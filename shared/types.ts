/**
 * Canonical types shared by the browser (WASM) renderer, the server (native)
 * renderer, and the Vue app. App-only types (Photo, …) live in
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
  borderRadius: number;
  paddingTop: number;
  paddingBottom: number;
  paddingHorizontal: number;
  showLogo: boolean;
  logoPosition: "left" | "center" | "right";
  logoText?: string;
  logoImageUrl?: string;
  logoScale?: number;
  logoAspect?: number;
  infoLayout: "grid" | "list" | "horizontal";
  visibleFields: ExifFieldKey[] | string[];
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  modelFontSize: number;
  canvasMode: "original" | "social";
  /** Output aspect ratio (W:H), e.g. "1:1", "16:9", "7:5" */
  socialRatio?: string;
  /** "solid" fills with backgroundColor; "blur" fills with the photo itself, blurred */
  backgroundMode?: "solid" | "blur";
  /** Blur radius of the "blur" background (1080-base px) */
  backgroundBlur?: number;
  /** How much the "blur" background is darkened, 0–90 % */
  backgroundDim?: number;
  /** Drop shadow under the photo, 0 (none) – 100 */
  photoShadow?: number;
  /**
   * "stack": logo and EXIF placed by logoPosition / infoLayout.
   * "split": the camera-watermark bar — model and lens on the left; logo, a
   * divider, then exposure over date/location on the right.
   */
  captionStyle?: "stack" | "split";
  /** Colour of secondary text (EXIF in "stack", second lines in "split") */
  secondaryColor?: string;
  /** Tracking for caption and edge text (1080-base px) */
  letterSpacing?: number;
  /** Retro LCD date stamp in the photo's bottom-right corner */
  dateStamp?: boolean;
  dateStampColor?: string;
  /** Film edge marking printed in the top border, e.g. "KODAK PORTRA 400" */
  edgeText?: string;
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
  /**
   * Image source node `src`. The render API requires an image data URL; the
   * browser renderer passes a placeholder key and supplies the bytes through
   * takumi's `images` option instead, so no base64 copy of the photo is made.
   */
  photoBase64: string;
  exifData?: ExifData;
  templateConfig: TemplateConfig;
  exportOptions?: Partial<ExportOptions>;
  photoWidth?: number;
  photoHeight?: number;
  crop?: Partial<PhotoCrop>;
}

/** A takumi node (container/text/image); its shape is owned by takumi-js */
export type RenderNode = Record<string, any>;

export interface RenderTreeResult {
  nodeTree: RenderNode;
  width: number;
  height: number;
  format: ExportFormat;
  quality: number;
  /** The photo's clipping frame inside nodeTree (the preview hangs crop dragging on it) */
  photoFrame: RenderNode;
}

/** Cover-crop geometry for a box */
export interface CropRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
