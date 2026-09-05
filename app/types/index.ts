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

import type { ExifData, TemplateConfig, PhotoCrop } from "~~/shared/types";

/** Full state of a single photo */
export interface Photo {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** Original image Base64 Data URL */
  dataUrl: string;
  /** JPEG thumb for the filmstrip (~256px); full `dataUrl` is for preview/export */
  thumbUrl: string;
  width: number;
  height: number;
  exif: ExifData;
  templateId: string;
  templateOverrides?: Partial<TemplateConfig>;
  crop?: PhotoCrop;
  addedAt: Date;
}

/** Render result */
export interface RenderResponse {
  imageBase64: string;
  mimeType: string;
  width: number;
  height: number;
}
