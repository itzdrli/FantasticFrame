/**
 * The takumi WASM binary as raw bytes, for the `module` render option.
 * Copied to dist/takumi.wasm at build time (scripts/copy-assets.ts); read
 * from disk at runtime — the Appwrite Functions artifact unzips to a real
 * filesystem. @takumi-rs/wasm's exports map blocks direct subpath imports.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const file = path.join(import.meta.dir, "takumi.wasm");
const wasmBytes = new Uint8Array(readFileSync(file));
export default wasmBytes;
