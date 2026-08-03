import { defineEventHandler, readBody, createError } from "h3";
// @ts-ignore
import { render } from "takumi-js";
import { buildRenderTree } from "../../shared/render";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { photoBase64, templateConfig } = body;

    if (!photoBase64 || !templateConfig) {
      throw createError({
        statusCode: 400,
        message: "Missing required parameters: photoBase64 or templateConfig",
      });
    }

    const { nodeTree, width, height, format, quality } = buildRenderTree(body);

    const imageBuffer = await render(nodeTree, {
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
