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
  RenderNode,
  CropRect,
} from "~~/shared/types";

import type { ExifData, TemplateConfig, PhotoCrop } from "~~/shared/types";

/** Full state of a single photo */
export interface Photo {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** The original file. Kept as a Blob (not base64) so 50 photos don't cost 50 big strings */
  file: Blob;
  /** Object URL of `file` for the preview; revoked when the photo is removed */
  url: string;
  /** JPEG thumb for the filmstrip (~256px) */
  thumbUrl: string;
  /** Average colour (#rrggbb), the base under a blurred background */
  tone?: string;
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
