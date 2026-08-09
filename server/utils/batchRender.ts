import { render } from "takumi-js";
import { Zip, ZipDeflate } from "fflate";
import { buildRenderTree } from "../../shared/render";
import type { RenderPayload } from "../../shared/types";

/**
 * Batch render job store.
 *
 * A job renders all items server-side (native takumi, worker threads) with
 * limited concurrency, streams the results into a zip archive, and keeps the
 * archive in memory until the client downloads it. Jobs expire after a TTL.
 */

export interface BatchItem {
  payload: RenderPayload;
  originalFilename: string;
}

export interface BatchJob {
  id: string;
  status: "rendering" | "done" | "error";
  total: number;
  done: number;
  failed: number;
  errors: { filename: string; message: string }[];
  zipName: string;
  zipChunks: Uint8Array[];
  createdAt: number;
}

const jobs = new Map<string, BatchJob>();
const JOB_TTL_MS = 10 * 60 * 1000;

function purgeExpiredJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}

export function getJob(id: string): BatchJob | undefined {
  return jobs.get(id);
}

/** Removes a finished job and frees its zip bytes from memory */
export function releaseJob(id: string) {
  jobs.delete(id);
}

export function createBatchJob(items: BatchItem[]): BatchJob {
  purgeExpiredJobs();
  const job: BatchJob = {
    id: crypto.randomUUID(),
    status: "rendering",
    total: items.length,
    done: 0,
    failed: 0,
    errors: [],
    zipName: makeZipName(items),
    zipChunks: [],
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  runJob(job, items).catch((err) => {
    job.status = "error";
    console.error("[batchRender] job failed:", err);
  });
  return job;
}

function makeZipName(items: BatchItem[]): string {
  const first = items[0]?.originalFilename?.replace(/\.[^.]+$/, "") || "export";
  const safe = first.replace(/[^\w\u4e00-\u9fa5-]+/g, "-").slice(0, 60) || "export";
  return `${safe}-export.zip`;
}

function zipEntryName(originalFilename: string, format: string): string {
  const base = originalFilename.replace(/\.[^.]+$/, "") || "photo";
  const ext = format === "jpeg" ? "jpg" : format === "webp" ? "webp" : "png";
  return `${base}.${ext}`;
}

/** Runs fn over items with limited concurrency (single-threaded JS, so no races on the cursor) */
async function mapLimit<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
}

async function runJob(job: BatchJob, items: BatchItem[]) {
  const zip = new Zip((err, data, final) => {
    if (err) console.error("[batchRender] zip error:", err);
    if (data) job.zipChunks.push(data);
    if (final) job.status = "done";
  });

  await mapLimit(items, 3, async (item) => {
    try {
      if (!item.payload?.photoBase64) {
        throw new Error("Missing photoBase64");
      }
      const { nodeTree, width, height, format, quality } = buildRenderTree(item.payload);
      // Native render on Node/Bun; @ts-ignore silences the wasm/native format union mismatch
      // @ts-ignore
      const buf = await render(nodeTree, { width, height, format, quality });
      const file = new ZipDeflate(zipEntryName(item.originalFilename, format));
      zip.add(file); // wires file.ondata into the zip before any data is pushed
      file.push(new Uint8Array(buf), true);
      job.done++;
    } catch (e) {
      job.failed++;
      job.errors.push({
        filename: item.originalFilename,
        message: e instanceof Error ? e.message : String(e),
      });
      console.error("[batchRender] item failed:", item.originalFilename, e);
    }
  });

  zip.end();
}
