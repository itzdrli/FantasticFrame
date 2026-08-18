/**
 * Copies the repo-root shared/ modules (render tree builder, types, limits,
 * validation) into src/shared/ so the bundled function stays in sync with
 * the app's server renderer without a workspace dependency.
 */
import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dir, "..", "..");
const src = path.join(root, "shared");
const dst = path.join(import.meta.dir, "..", "src", "shared");
const dist = path.join(import.meta.dir, "..", "dist");

mkdirSync(dst, { recursive: true });
for (const f of ["render.ts", "types.ts", "limits.ts", "validate.ts"]) {
  cpSync(path.join(src, f), path.join(dst, f));
  console.log(`[copy-assets] ${f} -> src/shared/`);
}

// takumi WASM binary next to the bundle — src/wasm.ts reads it at runtime
// (also copied into src/ so the unbundled source can run: scripts/harness.ts)
const require = createRequire(import.meta.url);
const wasmPkg = require.resolve("@takumi-rs/wasm/package.json");
const wasmSrc = path.join(path.dirname(wasmPkg), "pkg", "takumi_wasm_bg.wasm");
mkdirSync(dist, { recursive: true });
cpSync(wasmSrc, path.join(dist, "takumi.wasm"));
cpSync(wasmSrc, path.join(import.meta.dir, "..", "src", "takumi.wasm"));
console.log(`[copy-assets] takumi.wasm -> dist/ + src/`);
