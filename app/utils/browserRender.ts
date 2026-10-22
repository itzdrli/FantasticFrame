import { buildRenderTree } from "~~/shared/render";
import { loadExportFonts } from "~~/shared/fontLoader";
import type { RenderPayload } from "~~/shared/types";

/** A render request whose photo is a Blob — no base64 copy is ever made of it */
export type BrowserRenderInput = Omit<RenderPayload, "photoBase64" | "fonts"> & { photo: Blob };

/** Client-side render result — raw bytes, no base64 round-trip. */
export interface RenderResult {
  bytes: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
}

/** Placeholder `src` in the node tree; the bytes are handed over via `images` */
const PHOTO_KEY = "ff-photo:source";

export const mimeForFormat = (format: string): string =>
  format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";

/**
 * Renders with takumi's WASM backend. Runs on the main thread or inside the
 * render worker (it touches no DOM and no Vue), so it is the single code path
 * for both.
 */
export async function renderInBrowser(input: BrowserRenderInput): Promise<RenderResult> {
  const { photo, ...rest } = input;
  const { nodeTree, width, height, format, quality } = buildRenderTree({
    ...rest,
    photoBase64: PHOTO_KEY,
  });
  const [takumi, data, fonts] = await Promise.all([
    import("takumi-js"),
    photo.arrayBuffer(),
    loadExportFonts(input.templateConfig.fontFamily, { origin: "" }),
  ]);
  const buf = await takumi.render(
    nodeTree as any,
    {
      width,
      height,
      format: format as "png" | "jpeg" | "webp",
      quality,
      fonts,
      // Emoji come from the loaded fonts; the default fetches them from a CDN
      emoji: "from-font",
      images: [{ src: PHOTO_KEY, data: new Uint8Array(data) }],
    } as any,
  );
  return { bytes: new Uint8Array(buf), mimeType: mimeForFormat(format), width, height };
}
