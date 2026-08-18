/**
 * Core batch logic, framework-free: render items with the WASM backend and
 * build a zip. Kept separate from the Appwrite req/res shim so it can be
 * exercised directly (scripts/harness.ts).
 */
import { render as takumiRender } from "takumi-js";
import { Zip, ZipDeflate } from "fflate";
import wasmBytes from "./wasm";
import { buildRenderTree } from "./shared/render";
import type { RenderPayload } from "./shared/types";

export interface BatchItem {
  payload: RenderPayload;
  originalFilename: string;
}

export interface BatchResult {
  ok: boolean;
  done: number;
  failed: number;
  errors: { filename: string; message: string }[];
  zip: Uint8Array | null;
}

async function renderWasm(
  nodeTree: unknown,
  opts: { width: number; height: number; format: string; quality?: number },
): Promise<Uint8Array> {
  const buf = await takumiRender(
    nodeTree as any,
    {
      ...opts,
      module: wasmBytes,
    } as any,
  );
  return new Uint8Array(buf as unknown as ArrayBufferLike);
}

function zipEntryName(originalFilename: string, format: string): string {
  const base = originalFilename.replace(/\.[^.]+$/, "") || "photo";
  const ext = format === "jpeg" ? "jpg" : format === "webp" ? "webp" : "png";
  return `${base}.${ext}`;
}

/**
 * Renders every item; returns zip bytes, or null when all items failed (the
 * caller must not receive an empty archive in that case).
 */
export async function renderBatch(items: BatchItem[]): Promise<BatchResult> {
  let done = 0;
  let failed = 0;
  const errors: { filename: string; message: string }[] = [];
  const chunks: Uint8Array[] = [];
  let zipError: Error | null = null;

  const zip = new Zip((err, data) => {
    if (err) zipError = err;
    if (data) chunks.push(data);
  });

  for (const item of items) {
    try {
      if (!item.payload?.photoBase64) throw new Error("Missing photoBase64");
      const { nodeTree, width, height, format, quality } = buildRenderTree(item.payload);
      const buf = await renderWasm(nodeTree, { width, height, format, quality });
      const file = new ZipDeflate(zipEntryName(item.originalFilename, format));
      zip.add(file);
      file.push(new Uint8Array(buf), true);
      done++;
    } catch (e: any) {
      failed++;
      errors.push({ filename: item.originalFilename, message: e?.message ?? String(e) });
    }
  }

  if (zipError) throw zipError;
  if (done === 0) {
    return { ok: false, done, failed, errors, zip: null };
  }

  // end() flushes the central directory synchronously (verified against
  // fflate in scripts/zip-check.ts); the callback-settled chunks are complete
  zip.end();
  const zipBuf = concat(chunks);

  return { ok: true, done, failed, errors, zip: zipBuf };
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}
