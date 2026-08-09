/**
 * FantasticFrame — Core type definitions.
 *
 * Shared (app + server) types live in ~~/shared/types and are re-exported
 * here so app code can keep importing from "~/types".
 */

export type {
  ExifFieldKey,
  ExifData,
  TemplateConfig,
  PhotoCrop,
  ExportFormat,
  ExportOptions,
  RenderPayload,
  RenderTreeResult,
  CropRect,
} from "~~/shared/types";

export { SOCIAL_RATIO_HEIGHTS } from "~~/shared/types";

import type { ExifData, TemplateConfig, PhotoCrop, ExportOptions } from "~~/shared/types";

// ==================== Photo (app-only) ====================

/** Full state of a single photo */
export interface Photo {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** Original image Base64 Data URL */
  dataUrl: string;
  width: number;
  height: number;
  exif: ExifData;
  templateId: string;
  templateOverrides?: Partial<TemplateConfig>;
  crop?: PhotoCrop;
  addedAt: Date;
}

// ==================== Template system (app-only) ====================

/** Border template definition */
export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  defaultConfig: TemplateConfig;
}

// ==================== Render request/response (app-only) ====================

/** Request body sent to server/api/render */
export interface RenderRequest {
  photoBase64: string;
  exifData: ExifData;
  templateId: string;
  templateConfig: TemplateConfig;
  exportOptions: ExportOptions;
}

/** Render result */
export interface RenderResponse {
  imageBase64: string;
  mimeType: string;
  width: number;
  height: number;
}
