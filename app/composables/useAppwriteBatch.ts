import { ID, Storage, Functions } from "appwrite";
import type { BatchExportProgress } from "~/composables/useImageRender";
import type { RenderPayload } from "~~/shared/types";

/**
 * Batch export over Appwrite: upload the request JSON to Storage, execute the
 * ff-batch-render function, then poll the results bucket for the zip.
 *
 * Rationale: the in-memory /api/render/batch job store doesn't survive Sites'
 * multi-instance SSR runtime (polls randomly 404). Storage carries the payload
 * instead, and the function renders with the WASM backend.
 *
 * Flow:
 * 1. client creates <jobId>.json in ff-batch-uploads (bucket setting:
 *    create=users so only signed-in sessions can start jobs)
 * 2. client executes the function with { fileId } (async=true)
 * 3. function renders + zips, uploads <fileId>.zip to ff-batch-results
 *    (bucket read=users), deletes the request JSON
 * 4. client polls listFiles for the zip, downloads it via getFileDownload
 *
 * If the app has no logged-in session, upload/execution fail with 401 — the
 * caller (useImageRender.batchExport) falls back to the server API.
 */

const UPLOADS_BUCKET = "ff-batch-uploads";
const RESULTS_BUCKET = "ff-batch-results";

export interface AppwriteBatchConfig {
  functionId: string;
}

export function useAppwriteBatch() {
  const config = useRuntimeConfig();
  const { client } = useAppwrite();
  const functionId = config.public.appwriteBatchFunctionId as string | undefined;

  /** True when the Appwrite batch path is configured (non-empty function id) */
  const isAvailable = () => Boolean(functionId);

  const storage = new Storage(client);
  const functions = new Functions(client);

  /**
   * Runs the batch through Appwrite. Throws on any failure — no partial zip.
   */
  async function exportBatch(
    items: Array<{ payload: RenderPayload; originalFilename: string }>,
    onProgress?: (p: BatchExportProgress) => void,
  ): Promise<{ success: number; failed: number }> {
    if (!functionId) throw new Error("appwrite batch function not configured");

    onProgress?.({ current: 0, total: items.length, status: "rendering" });

    // 1. upload request JSON (Storage carries the photos to the function)
    const fileId = ID.unique();
    const body = JSON.stringify({ items });
    const file = new File([body], `${fileId}.json`, { type: "application/json" });
    await storage.createFile(UPLOADS_BUCKET, fileId, file);

    try {
      // 2. kick the function (sync execution — responseBody carries the result)
      const execution = await functions.createExecution(
        functionId,
        JSON.stringify({ fileId }),
        false,
      );
      const result = safeJson(execution.responseBody);
      if (!result?.ok) {
        throw new Error(result?.message || `function failed (${execution.status})`);
      }

      onProgress?.({ current: items.length, total: items.length, status: "saving" });

      // 3. fetch the zip from the results bucket
      const url = storage.getFileDownload(RESULTS_BUCKET, fileId);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`zip download failed: ${res.status}`);
      const zipBlob = await res.blob();

      // 4. browser download + cleanup of the result file
      downloadZip(zipBlob, `fantasticframe-export-${fileId}.zip`);
      await storage.deleteFile(RESULTS_BUCKET, fileId).catch(() => {});

      return { success: result.done as number, failed: result.failed as number };
    } catch (err) {
      // leave nothing behind on failure
      await storage.deleteFile(UPLOADS_BUCKET, fileId).catch(() => {});
      throw err;
    }
  }

  return { isAvailable, exportBatch };
}

function safeJson(text: string | undefined | null): any {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function downloadZip(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
