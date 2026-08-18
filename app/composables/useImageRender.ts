import { ref } from "#imports";
import { useAppwriteBatch } from "~/composables/useAppwriteBatch";
import { buildRenderTree } from "~~/shared/render";
import {
  MAX_BATCH_ITEMS,
  MAX_PHOTO_BYTES,
  MAX_TOTAL_PHOTO_BYTES,
  estimateBase64Bytes,
} from "~~/shared/limits";
import type { ExportOptions, RenderPayload } from "~~/shared/types";
import type { RenderResponse } from "~/types";

export type { RenderPayload, RenderResponse };

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

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

let wasmPromise: Promise<typeof import("takumi-js")> | null = null;
const getTakumi = () => {
  wasmPromise ??= import("takumi-js");
  return wasmPromise;
};

/** Infers the file extension from a base64 data URL */
function extFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
  if (!m) return "jpg";
  return m[1] === "jpeg" ? "jpg" : m[1]!;
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
  const appwriteBatch = useAppwriteBatch();

  /**
   * Internal render core (does not touch isRendering, shared by renderImage / batchExport)
   */
  const _renderOne = async (payload: RenderPayload): Promise<RenderResponse | null> => {
    const finalPayload = payload.exportOptions
      ? payload
      : { ...payload, exportOptions: { format: exportFormat.value, quality: exportQuality.value } };

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
  const renderImage = async (payload: RenderPayload): Promise<RenderResponse | null> => {
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
  const renderClientSide = async (payload: RenderPayload): Promise<RenderResponse | null> => {
    const takumi = await getTakumi();
    const { nodeTree, width, height, format, quality } = buildRenderTree(payload);
    const buf = await takumi.render(nodeTree, {
      width,
      height,
      format: format as "png" | "jpeg" | "webp",
      quality,
    } as any);
    const mimeType =
      format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
    return {
      imageBase64: `data:${mimeType};base64,${bytesToBase64(new Uint8Array(buf))}`,
      mimeType,
      width,
      height,
    };
  };

  /**
   * Calls the backend render API (fallback when WASM rendering fails)
   */
  const renderServerSide = async (payload: RenderPayload): Promise<RenderResponse | null> => {
    try {
      const response = await $fetch<RenderResponse>("/api/render", {
        method: "POST",
        body: payload,
      });
      return response;
    } catch (err: any) {
      error.value = err?.data?.message || err?.message || "Render failed";
      console.error("Render API error:", err);
      return null;
    }
  };

  /**
   * Downloads the returned Base64 image (browser download)
   * @param base64 Complete base64 image string (includes data:image/...)
   * @param filename Download file name, without extension
   */
  const downloadImage = (base64: string, filename = "exported-image") => {
    try {
      const link = document.createElement("a");
      link.href = base64;
      const ext = extFromDataUrl(base64);
      link.download = buildExportFilename(filename, ext);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  /**
   * Saves a single image (triggers a browser download)
   */
  const saveImage = (base64: string, originalFilename: string): void => {
    downloadImage(base64, originalFilename);
  };

  /**
   * Batch-renders and exports photos as a single zip.
   *
   * Rendering runs server-side (native takumi) so the main thread stays free;
   * progress is polled from the server and reported per completed photo.
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
      const finalItems = items.map((item) =>
        item.payload.exportOptions
          ? item
          : {
              ...item,
              payload: {
                ...item.payload,
                exportOptions: {
                  format: exportFormat.value,
                  quality: exportQuality.value,
                },
              },
            },
      );
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

      // Appwrite Storage caps a single file at 50MB; base64 inflates by 4/3,
      // so a request JSON above ~36MB of photos cannot be uploaded at all.
      if (appwriteBatch.isAvailable() && totalBytes > 36 * 1024 * 1024) {
        throw new Error(
          `Batch too large for Appwrite Storage (max ~36MB of photos): reduce the number or size of photos`,
        );
      }

      // Appwrite path first (Storage + function): the in-memory server job
      // store does not survive the Sites SSR runtime, so prefer it whenever
      // configured. Falls back to /api/render/batch when unavailable or failed
      // (e.g. no logged-in session — bucket writes need one).
      if (appwriteBatch.isAvailable()) {
        try {
          batchProgress.value = { current: 0, total: finalItems.length, status: "rendering" };
          return await appwriteBatch.exportBatch(finalItems, (p: BatchExportProgress) => {
            batchProgress.value = p;
            onProgress?.(p);
          });
        } catch (err: any) {
          console.warn("[useImageRender] Appwrite batch failed, falling back to server API:", err);
        }
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
   * Triggers a browser download for a Blob (zip exports)
   */
  const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    isRendering,
    error,
    exportFormat,
    exportQuality,
    batchProgress,
    renderImage,
    batchExport,
    downloadImage,
    saveImage,
  };
};
