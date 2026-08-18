import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { render as takumiRender } from "takumi-js";

/**
 * Server-side takumi render with a native-to-WASM backend fallback.
 *
 * `#backend` resolves to @takumi-rs/core (native addon) on Node/Bun, which is
 * unavailable in sandboxed runtimes (Appwrite Sites/Functions). Passing the
 * `module` option forces the WASM backend — takumi-js clears its backend
 * cache on load failure, so a native miss followed by a WASM retry works.
 * The raw bytes are read directly (not via the bundler wrappers, which
 * eagerly initSync() and would fight the renderer's own init), resolving
 * through node resolution so it works both in dev and in the traced nitro
 * output (postbuild overlays the full @takumi-rs package).
 */
let wasmBytes: Uint8Array | null = null;

function getWasmBytes(): Uint8Array {
  if (!wasmBytes) {
    const pkgJson = createRequire(import.meta.url).resolve("@takumi-rs/wasm/package.json");
    const file = path.join(path.dirname(pkgJson), "pkg", "takumi_wasm_bg.wasm");
    wasmBytes = new Uint8Array(readFileSync(file));
  }
  return wasmBytes;
}

/** "native" | "wasm", probed once per process */
let backendProbe: Promise<"native" | "wasm"> | null = null;

function probeBackend() {
  // A 1x1 PNG render exercises the full native path; a rejection means the
  // addon can't load (or panics) in this runtime.
  backendProbe ??= takumiRender({ type: "container", style: { width: 1, height: 1 } }, {
    width: 1,
    height: 1,
    format: "png",
  } as any)
    .then(() => "native" as const)
    .catch(() => "wasm" as const);
  return backendProbe;
}

/**
 * Renders a takumi node tree — native when available, WASM otherwise.
 */
export async function renderServer(
  nodeTree: unknown,
  opts: { width: number; height: number; format: string; quality?: number },
): Promise<Uint8Array> {
  const backend = await probeBackend();
  const options = backend === "wasm" ? ({ ...opts, module: getWasmBytes() } as any) : (opts as any);
  const buf = await takumiRender(nodeTree as any, options);
  return new Uint8Array(buf as unknown as ArrayBufferLike);
}
