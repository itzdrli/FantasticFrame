import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { render as takumiRender } from "takumi-js";
import { loadExportFonts } from "../../shared/fontLoader";

/**
 * Server-side takumi render with a native-to-WASM backend fallback.
 *
 * `#backend` resolves to @takumi-rs/core (native addon) on Node/Bun, which may be
 * unavailable in some sandboxed runtimes. Passing the `module` option forces the
 * WASM backend — takumi-js clears its backend cache on load failure, so a native
 * miss followed by a WASM retry works.
 */
let wasmBytes: Uint8Array | null = null;

/**
 * Locates the takumi WASM binary. Resolving "./package.json" is not an
 * option: @takumi-rs/wasm's exports map doesn't expose that subpath, and
 * Node's strict exports enforcement rejects the lookup (Bun tolerates it).
 * Resolving an exported entry and walking up to the package root dodges the exports map.
 */
function locateWasmFile(): string {
  const entry = createRequire(import.meta.url).resolve("@takumi-rs/wasm");
  let dir = path.dirname(entry);
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "pkg", "takumi_wasm_bg.wasm");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`takumi_wasm_bg.wasm not found above ${entry}`);
}

function getWasmBytes(): Uint8Array {
  if (!wasmBytes) {
    wasmBytes = new Uint8Array(readFileSync(locateWasmFile()));
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
 * Fonts are derived from the template's `fontFamily` and fetched from this
 * server's own static files; emoji come from the loaded fonts, so a render
 * never contacts a third-party host.
 */
export async function renderServer(
  nodeTree: unknown,
  opts: { width: number; height: number; format: string; quality?: number },
  fontFamily?: string,
): Promise<Uint8Array> {
  const backend = await probeBackend();
  const options = backend === "wasm" ? ({ ...opts, module: getWasmBytes() } as any) : (opts as any);
  options.emoji = "from-font";
  options.fonts = await loadExportFonts(fontFamily, { origin: assetOrigin() });
  const buf = await takumiRender(nodeTree as any, options);
  return new Uint8Array(buf as unknown as ArrayBufferLike);
}

/**
 * Origin the server uses to fetch its own static assets. Fixed (never derived
 * from request headers, which are client-controlled); override with
 * FONT_ORIGIN when the app cannot reach itself on loopback.
 */
function assetOrigin(): string {
  const port = process.env.NITRO_PORT || process.env.PORT || "3000";
  return process.env.FONT_ORIGIN || `http://127.0.0.1:${port}`;
}
