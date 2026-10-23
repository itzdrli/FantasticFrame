import { ref } from "#imports";
import type { ExportOptions, RenderPayload } from "~~/shared/types";
import { MAX_PHOTO_BYTES } from "~~/shared/limits";
import { renderOffMainThread } from "~/utils/renderWorker";
import type { BrowserRenderInput, RenderResult } from "~/utils/browserRender";
import type { RenderResponse } from "~/types";

export interface BatchExportProgress {
  /** Index of the photo currently being processed (0-based) */
  current: number;
  /** Total number of photos */
  total: number;
  /** Status */
  status: "rendering" | "saving" | "done" | "error";
  /** Error message (only set when status=error) */
  errorMessage?: string;
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

/** Builds an export file name: strips the original extension and adds the new one */
function buildExportFilename(originalName: string, ext: string): string {
  return originalName.replace(/\.[^.]+$/, "") + "." + ext;
}

/** Message from an Error or a $fetch error (server message lives in `data.message`) */
const errorMessage = (err: unknown, fallback: string): string => {
  const e = err as { data?: { message?: string }; message?: string } | null;
  return e?.data?.message || e?.message || fallback;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const useImageRender = () => {
  const isRendering = ref(false);
  const error = ref<string | null>(null);
  // Shared (useState): the Export settings section edits what this composable renders with
  const exportFormat = useState<ExportOptions["format"]>("ff:export-format", () => "jpeg");
  const exportQuality = useState<number>("ff:export-quality", () => 90);
  const batchProgress = ref<BatchExportProgress | null>(null);

  /**
   * Internal render core (does not touch isRendering, shared by renderImage / batchExport).
   * Renders in the browser (WASM, in a worker) — the photo stays on the device.
   * Only when that fails does the photo go to the server render API.
   */
  const _renderOne = async (input: BrowserRenderInput): Promise<RenderResult | null> => {
    const final: BrowserRenderInput = input.exportOptions
      ? input
      : { ...input, exportOptions: { format: exportFormat.value, quality: exportQuality.value } };
    try {
      return await renderOffMainThread(final);
    } catch (err) {
      console.warn("[useImageRender] browser render failed, falling back to server:", err);
    }
    return await renderServerSide(final);
  };

  /**
   * Renders a single image (with state management)
   */
  const renderImage = async (input: BrowserRenderInput): Promise<RenderResult | null> => {
    isRendering.value = true;
    error.value = null;
    try {
      return await _renderOne(input);
    } catch (err) {
      error.value = errorMessage(err, "Render failed");
      console.error("Render error:", err);
      return null;
    } finally {
      isRendering.value = false;
    }
  };

  /**
   * Calls the backend render API (fallback when WASM rendering fails)
   */
  const renderServerSide = async (input: BrowserRenderInput): Promise<RenderResult | null> => {
    try {
      if (input.photo.size > MAX_PHOTO_BYTES) {
        throw new Error(
          `Photo too large for server rendering (max ${Math.round(MAX_PHOTO_BYTES / 1e6)}MB)`,
        );
      }
      const { photo, ...rest } = input;
      const payload: RenderPayload = { ...rest, photoBase64: await blobToDataUrl(photo) };
      const response = await $fetch<RenderResponse>("/api/render", {
        method: "POST",
        body: payload,
      });
      if (!response?.imageBase64) return null;
      return {
        bytes: dataUrlToUint8Array(response.imageBase64),
        mimeType: response.mimeType,
        width: response.width,
        height: response.height,
      };
    } catch (err) {
      error.value = errorMessage(err, "Render failed");
      console.error("Render API error:", err);
      return null;
    }
  };

  /**
   * Converts a base64 data URL to a binary Uint8Array.
   */
  const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
    const commaIdx = dataUrl.indexOf(",");
    const b64 = commaIdx === -1 ? dataUrl : dataUrl.slice(commaIdx + 1);
    const binary = atob(b64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const saveImage = (bytes: Uint8Array, mimeType: string, originalFilename: string): void => {
    try {
      const outName = buildExportFilename(originalFilename, extFromMime(mimeType));
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: mimeType }), outName);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  /**
   * Batch-renders photos and bundles them into one zip.
   *
   * Everything happens in the browser (WASM in a worker + fflate); photos are
   * not uploaded. Items render one at a time so peak memory stays at a single
   * decoded photo plus the zip so far. Rendered images are already compressed,
   * so they are stored in the zip rather than deflated again.
   */
  const batchExport = async (
    items: Array<{ input: BrowserRenderInput; originalFilename: string }>,
    onProgress?: (p: BatchExportProgress) => void,
  ): Promise<{ success: number; failed: number }> => {
    isRendering.value = true;
    error.value = null;
    batchProgress.value = null;

    try {
      const { Zip, ZipPassThrough } = await import("fflate");
      const zipChunks: Uint8Array[] = [];
      let zipError: Error | null = null;
      const zip = new Zip((err, data) => {
        if (err) zipError = err;
        if (data) zipChunks.push(data);
      });

      const usedNames = new Set<string>();
      let done = 0;
      let failed = 0;
      const total = items.length;

      for (let i = 0; i < total; i++) {
        const item = items[i]!;
        const prog: BatchExportProgress = { current: i, total, status: "rendering" };
        batchProgress.value = prog;
        onProgress?.(prog);

        try {
          const res = await _renderOne(item.input);
          if (!res) throw new Error("Render returned empty result");

          // Two photos can share a file name (e.g. IMG_0001.jpg from two cards)
          const ext = extFromMime(res.mimeType);
          let outName = buildExportFilename(item.originalFilename, ext);
          for (let n = 2; usedNames.has(outName.toLowerCase()); n++) {
            outName = buildExportFilename(item.originalFilename, `${n}.${ext}`);
          }
          usedNames.add(outName.toLowerCase());

          const file = new ZipPassThrough(outName);
          zip.add(file);
          file.push(res.bytes, true);
          done++;
        } catch (err) {
          failed++;
          console.error(`[batchExport] Failed to render item ${item.originalFilename}:`, err);
        }
        // Yield so the progress bar paints
        await new Promise((r) => setTimeout(r, 0));
      }

      if (zipError) throw zipError;
      if (done === 0) {
        throw new Error("Batch render failed: all items failed to render");
      }

      batchProgress.value = { current: total, total, status: "saving" };
      onProgress?.(batchProgress.value);
      zip.end();

      const first = items[0]?.originalFilename?.replace(/\.[^.]+$/, "") || "export";
      const safe = first.replace(/[^\w\u4e00-\u9fa5-]+/g, "-").slice(0, 60) || "export";
      // The Blob takes the chunks as they are — no second full-size copy
      downloadBlob(
        new Blob(zipChunks as unknown as BlobPart[], { type: "application/zip" }),
        `${safe}-export.zip`,
      );

      return { success: done, failed };
    } catch (err) {
      error.value = errorMessage(err, "Batch export failed");
      console.error("Batch export error:", err);
      return { success: 0, failed: items.length };
    } finally {
      isRendering.value = false;
      batchProgress.value = {
        current: items.length,
        total: items.length,
        status: "done",
      };
    }
  };

  /**
   * Triggers a browser download for a Blob (images & zip exports)
   */
  const downloadBlob = (blob: Blob, filename: string): void => {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  return {
    isRendering,
    error,
    exportFormat,
    exportQuality,
    batchProgress,
    renderImage,
    batchExport,
    saveImage,
  };
};
