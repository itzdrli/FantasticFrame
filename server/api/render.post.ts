import { defineEventHandler, createError } from "h3";
import { renderServer } from "../utils/takumiServer";
import { enforceRateLimit, withRenderSlot } from "../utils/guard";
import { buildRenderTree } from "../../shared/render";
import type { RenderPayload } from "../../shared/types";
import { validateTemplateConfig } from "../../shared/validate";
import { readImageSize } from "../../shared/imageSize";
import {
  MAX_OUTPUT_PIXELS,
  MAX_PHOTO_BYTES,
  MAX_PHOTO_PIXELS,
  MAX_RENDER_BODY_BYTES,
  estimateBase64Bytes,
} from "../../shared/limits";
import { readJsonBodyCapped } from "../utils/limits";

const IMAGE_DATA_URL_RE = /^data:image\/(?:jpeg|png|webp|gif);base64,/i;

const tooBig = (what: string, max: number) =>
  createError({
    statusCode: 413,
    message: `${what} too large (max ${Math.round(max / 1e6)} megapixels)`,
  });

export default defineEventHandler(async (event) => {
  enforceRateLimit(event);

  const body = await readJsonBodyCapped(event, MAX_RENDER_BODY_BYTES);
  const { photoBase64, templateConfig } = body ?? {};

  if (typeof photoBase64 !== "string" || !IMAGE_DATA_URL_RE.test(photoBase64)) {
    throw createError({
      statusCode: 400,
      message: "photoBase64 must be a JPEG, PNG, WebP or GIF data URL",
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

  // Trust the image header, not the client's photoWidth/photoHeight: the
  // header is what the decoder will allocate for.
  const size = readImageSize(
    Buffer.from(photoBase64.slice(photoBase64.indexOf(",") + 1), "base64"),
  );
  if (!size || size.width < 1 || size.height < 1) {
    throw createError({ statusCode: 400, message: "Could not read the image dimensions" });
  }
  if (size.width * size.height > MAX_PHOTO_PIXELS) throw tooBig("Image", MAX_PHOTO_PIXELS / 1e6);

  const payload: RenderPayload = {
    ...(body as unknown as RenderPayload),
    photoWidth: size.width,
    photoHeight: size.height,
  };

  try {
    const { nodeTree, width, height, format, quality } = buildRenderTree(payload);
    if (width * height > MAX_OUTPUT_PIXELS) throw tooBig("Output", MAX_OUTPUT_PIXELS / 1e6);

    const imageBuffer = await withRenderSlot(() =>
      renderServer(nodeTree, { width, height, format, quality }, payload.templateConfig.fontFamily),
    );

    const buf = Buffer.from(imageBuffer);
    const mimeType =
      format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
    return {
      imageBase64: `data:${mimeType};base64,${buf.toString("base64")}`,
      mimeType,
      width,
      height,
    };
  } catch (error) {
    // h3 errors (413/429/503) carry their own status and a safe message
    if ((error as { statusCode?: number })?.statusCode) throw error;
    console.error("[render] failed:", error);
    throw createError({ statusCode: 500, message: "Render failed" });
  }
});
