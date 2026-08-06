import { cpSync, existsSync } from "node:fs";

/**
 * Post-build fix: overlay the complete takumi-js / @takumi-rs packages over
 * nitro's trace-based externalization copy.
 *
 * Nitro resolves takumi-js's #backend conditional import to the WASM build
 * during its externals tracing, so the copy in .output/server/node_modules is
 * missing dist/backend/node.mjs and trims @takumi-rs/core. At runtime bun
 * resolves #backend to the native backend, which would then fail to load.
 *
 * The overlay keeps the native renderer working both for `nuxt preview` on the
 * host and inside the docker image (which copies .output as-is).
 */
const out = ".output/server/node_modules";

for (const pkg of ["takumi-js", "@takumi-rs"]) {
  const src = `node_modules/${pkg}`;
  const dst = `${out}/${pkg}`;
  if (!existsSync(src)) {
    console.warn(`[postbuild] skip ${pkg}: source not found`);
    continue;
  }
  cpSync(src, dst, { recursive: true, force: true });
  console.log(`[postbuild] overlaid ${pkg} -> ${dst}`);
}
