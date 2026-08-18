import { defineEventHandler, createError } from "h3";
import { renderServer } from "../utils/takumiServer";
import { buildRenderTree } from "../../shared/render";
import type { RenderPayload } from "../../shared/types";
import { validateTemplateConfig } from "../../shared/validate";
import {
  MAX_PHOTO_BYTES,
  MAX_RENDER_BODY_BYTES,
  estimateBase64Bytes,
  readJsonBodyCapped,
} from "../utils/limits";

export default defineEventHandler(async (event) => {
  const body = await readJsonBodyCapped(event, MAX_RENDER_BODY_BYTES);
  const { photoBase64, templateConfig } = body ?? {};

  if (typeof photoBase64 !== "string" || !photoBase64.startsWith("data:image/")) {
    throw createError({
      statusCode: 400,
      message: "photoBase64 must be an image data URL",
    });
  }
  if (!templateConfig) {
    throw createError({
      statusCode: 400,
      message: "Missing required parameter: templateConfig",
    });
  }
  if (estimateBase64Bytes(photoBase64) > MAX_PHOTO_BYTES) {
    throw createError({
      statusCode: 413,
      message: `Photo too large (max ${Math.round(MAX_PHOTO_BYTES / 1e6)}MB per photo)`,
    });
  }
  const check = validateTemplateConfig(templateConfig);
  if (!check.valid) {
    throw createError({
      statusCode: 400,
      message: `Invalid templateConfig: ${check.errors.join("; ")}`,
    });
  }

  try {
    // body was validated above; cast through unknown because readJsonBodyCapped
    // returns a plain record
    const { nodeTree, width, height, format, quality } = buildRenderTree(
      body as unknown as RenderPayload,
    );
    const imageBuffer = await renderServer(nodeTree, {
      width,
      height,
      format,
      quality,
    });

    const buf = Buffer.from(imageBuffer);
    const mimeType =
      format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
    const imageBase64 = `data:${mimeType};base64,${buf.toString("base64")}`;

    return {
      imageBase64,
      mimeType,
      width,
      height,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: error.message || "Render failed",
    });
  }
});
