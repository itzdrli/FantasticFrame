import { ref } from "#imports";
import { buildRenderTree } from "~~/shared/render";
import { SELF_HOSTED_FONT_PATHS } from "~~/shared/fonts";
import {
  MAX_BATCH_ITEMS,
  MAX_PHOTO_BYTES,
  MAX_TOTAL_PHOTO_BYTES,
  estimateBase64Bytes,
} from "~~/shared/limits";
import type { ExportOptions, RenderPayload } from "~~/shared/types";
import type { RenderResponse } from "~/types";

export type { RenderPayload, RenderResponse };

/** Client-side render result — raw bytes, no base64 round-trip. */
export interface RenderResult {
  bytes: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
}

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

let wasmPromise: Promise<typeof import("takumi-js")> | null = null;
const getTakumi = () => {
  wasmPromise ??= import("takumi-js");
  return wasmPromise;
};

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

/** Builds an export file name: strips the original extension and adds the new one */
function buildExportFilename(originalName: string, ext: string): string {
  return originalName.replace(/\.[^.]+$/, "") + "." + ext;
}

export const useImageRender = () => {
  const isRendering = ref(false);
  const error = ref<string | null>(null);
  const exportFormat = ref<ExportOptions["format"]>("jpeg");
  const exportQuality = ref<number>(90);
  const batchProgress = ref<BatchExportProgress | null>(null);

  /**
   * Internal render core (does not touch isRendering, shared by renderImage / batchExport)
   */
  const _renderOne = async (payload: RenderPayload): Promise<RenderResult | null> => {
    const finalPayload: RenderPayload = {
      ...(payload.exportOptions
        ? payload
        : {
            ...payload,
            exportOptions: { format: exportFormat.value, quality: exportQuality.value },
          }),
      // Self-hosted faces are always registered; takumi loads them lazily and
      // only fetches the bytes when a node actually uses the family.
      fonts:
        payload.fonts && payload.fonts.length > 0 ? payload.fonts : [...SELF_HOSTED_FONT_PATHS],
    };
    if (import.meta.client) {
      // WASM can fail in many ways (module load, render reject, OOM). Any
      // throw must fall through to the server renderer — returning null
      // alone is not enough (regression: a WASM throw killed the export).
      try {
        const clientResult = await renderClientSide(finalPayload);
        if (clientResult) return clientResult;
      } catch (err) {
        console.warn("[useImageRender] client WASM render failed, falling back to server:", err);
      }
    }
    return await renderServerSide(finalPayload);
  };

  /**
   * Renders a single image (with state management)
   */
  const renderImage = async (payload: RenderPayload): Promise<RenderResult | null> => {
    isRendering.value = true;
    error.value = null;
    try {
      return await _renderOne(payload);
    } catch (err: any) {
      error.value = err.message || "Render failed";
      console.error("Render error:", err);
      return null;
    } finally {
      isRendering.value = false;
    }
  };

  /**
   * Client-side WASM rendering (takumi-js automatically uses the WASM backend in browsers)
   */
  const renderClientSide = async (payload: RenderPayload): Promise<RenderResult | null> => {
    const takumi = await getTakumi();
    const { nodeTree, width, height, format, quality } = buildRenderTree(payload);
    const buf = await takumi.render(nodeTree, {
      width,
      height,
      format: format as "png" | "jpeg" | "webp",
      quality,
      fonts: payload.fonts,
    } as any);
    const mimeType =
      format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
    return { bytes: new Uint8Array(buf), mimeType, width, height };
  };

  /**
   * Calls the backend render API (fallback when WASM rendering fails)
   */
  const renderServerSide = async (payload: RenderPayload): Promise<RenderResult | null> => {
    try {
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
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || "Render failed";
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
   * Client-side batch render and zip packing.
   * Renders photos sequentially in the browser via WASM and bundles them
   * using fflate without requiring server-side state or huge file uploads.
   */
  const exportBatchClientSide = async (
    items: Array<{ payload: RenderPayload; originalFilename: string }>,
    onProgress?: (p: BatchExportProgress) => void,
  ): Promise<{ success: number; failed: number }> => {
    const { Zip, ZipDeflate } = await import("fflate");
    const zipChunks: Uint8Array[] = [];
    let zipError: Error | null = null;
    const zip = new Zip((err, data) => {
      if (err) zipError = err;
      if (data) zipChunks.push(data);
    });

    let done = 0;
    let failed = 0;
    const total = items.length;

    for (let i = 0; i < total; i++) {
      const item = items[i]!;
      const prog: BatchExportProgress = { current: i, total, status: "rendering" };
      batchProgress.value = prog;
      onProgress?.(prog);

      try {
        const res = await _renderOne(item.payload);
        if (!res) {
          throw new Error("Render returned empty result");
        }
        const outName = buildExportFilename(item.originalFilename, extFromMime(res.mimeType));

        const file = new ZipDeflate(outName);
        zip.add(file);
        file.push(res.bytes, true);
        done++;
      } catch (err) {
        failed++;
        console.error(`[batchExport] Failed to render item ${item.originalFilename}:`, err);
      }
      // Yield to let UI update and allow garbage collection
      await new Promise((r) => setTimeout(r, 10));
    }

    if (zipError) throw zipError;
    if (done === 0) {
      throw new Error("Batch render failed: all items failed to render");
    }

    const saveProg: BatchExportProgress = { current: total, total, status: "saving" };
    batchProgress.value = saveProg;
    onProgress?.(saveProg);

    zip.end();

    const totalLen = zipChunks.reduce((acc, c) => acc + c.length, 0);
    const zipMerged = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of zipChunks) {
      zipMerged.set(c, offset);
      offset += c.length;
    }

    const first = items[0]?.originalFilename?.replace(/\.[^.]+$/, "") || "export";
    const safe = first.replace(/[^\w\u4e00-\u9fa5-]+/g, "-").slice(0, 60) || "export";
    downloadBlob(
      new Blob([zipMerged as unknown as BlobPart], { type: "application/zip" }),
      `${safe}-export.zip`,
    );

    return { success: done, failed };
  };

  /**
   * Batch-renders and exports photos as a single zip.
   *
   * Client-side WASM batching is preferred in the browser,
   * with server fallback for other environments.
   *
   * @param items Render params and original file name for each photo
   * @param onProgress Progress callback (optional)
   */
  const batchExport = async (
    items: Array<{ payload: RenderPayload; originalFilename: string }>,
    onProgress?: (p: BatchExportProgress) => void,
  ): Promise<{ success: number; failed: number }> => {
    isRendering.value = true;
    error.value = null;
    batchProgress.value = null;

    try {
      // The UI's format/quality selection must reach the server: batch items
      // built by callers may omit exportOptions, and buildRenderTree then
      // defaults to PNG@95 (regression: picking JPEG 90% and batch-exporting
      // produced PNGs). Mirror _renderOne's fallback for every item.
      const finalItems = items.map((item) => {
        const payload = item.payload;
        return {
          ...item,
          payload: {
            ...payload,
            exportOptions: payload.exportOptions ?? {
              format: exportFormat.value,
              quality: exportQuality.value,
            },
            fonts:
              payload.fonts && payload.fonts.length > 0
                ? payload.fonts
                : [...SELF_HOSTED_FONT_PATHS],
          },
        };
      });
      // Pre-flight against the SAME limits the server enforces (shared/limits.ts),
      // so a batch the server would reject (e.g. many large PNGs) fails fast
      // with a clear message instead of uploading hundreds of MB first.
      let totalBytes = 0;
      for (const item of finalItems) {
        const b64 = item.payload.photoBase64;
        if (typeof b64 !== "string") continue; // server will 400
        const bytes = estimateBase64Bytes(b64);
        if (bytes > MAX_PHOTO_BYTES) {
          throw new Error(
            `Photo too large: ${item.originalFilename} (max ${Math.round(MAX_PHOTO_BYTES / 1e6)}MB per photo)`,
          );
        }
        totalBytes += bytes;
      }
      if (finalItems.length > MAX_BATCH_ITEMS) {
        throw new Error(`Too many photos in one batch (max ${MAX_BATCH_ITEMS})`);
      }
      if (totalBytes > MAX_TOTAL_PHOTO_BYTES) {
        throw new Error(
          `Batch too large: total photos exceed ${Math.round(MAX_TOTAL_PHOTO_BYTES / 1e6)}MB — reduce the number or size of photos`,
        );
      }

      // Client-side batch export: runs directly in the browser using WASM + fflate.
      if (import.meta.client) {
        return await exportBatchClientSide(finalItems, onProgress);
      }

      const { jobId } = await $fetch<{ jobId: string }>("/api/render/batch", {
        method: "POST",
        body: { items: finalItems },
      });

      let status: { status: string; total: number; done: number; failed: number };
      do {
        await new Promise((r) => setTimeout(r, 300));
        status = await $fetch(`/api/render/batch/status?jobId=${jobId}`);
        const prog: BatchExportProgress = {
          current: status.done,
          total: status.total,
          status: "rendering",
        };
        batchProgress.value = prog;
        onProgress?.(prog);
      } while (status.status === "rendering");

      if (status.status === "error") {
        // All items failed — there is no zip to download. Surface the first
        // server-side error instead of handing the user an empty archive.
        const detail = (status as any).errors?.[0]?.message as string | undefined;
        throw new Error(detail || "Batch render failed on server — no files were produced");
      }
      if (status.status !== "done") {
        throw new Error("Batch render failed on server");
      }

      batchProgress.value = {
        current: status.total,
        total: status.total,
        status: "saving",
      };
      const res = await $fetch.raw<ArrayBuffer>(`/api/render/batch/download?jobId=${jobId}`, {
        responseType: "arrayBuffer",
      });
      const disposition = res.headers.get("content-disposition") ?? "";
      const filename =
        disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1] ??
        disposition.match(/filename="?([^"]+)"?/i)?.[1] ??
        "export.zip";
      downloadBlob(
        new Blob([res._data ?? new Uint8Array()], { type: "application/zip" }),
        filename,
      );

      const success = Number(res.headers.get("x-ff-export-success")) || status.done;
      const failed = Number(res.headers.get("x-ff-export-failed")) || status.failed;
      return { success, failed };
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || "Batch export failed";
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
