# AGENTS.md

## Project

Fantastic Frame — a photo framing tool: add a border and an EXIF caption footer
(camera, aperture, shutter, ISO, focal length, date) under photos. Templates are
just saved configs; presets exist but everything is settable by hand.

- Single export renders **client-side in the browser** via takumi-js WASM (photo
  never leaves the device); falls back to the server render API if WASM fails.
- Batch export uploads to the server, which renders with native takumi in worker
  threads, zips results in memory, and drops the job after download or a 10-min
  TTL. No disk, no DB, no accounts.
- Hosted at ff.itzdrli.cc; server in Germany (GDPR).

## Stack

- Nuxt 4 / Vue 3 / Pinia / TypeScript
- Tailwind v4 (Nord palette), fonts loaded via Google Fonts in `nuxt.config.ts`
- Rendering: takumi-js (WASM in browser, native on server); `@takumi-rs` backend
- EXIF parsed by exifr; zips via fflate
- Package manager: **bun**; runtime: Bun (nitro preset `bun`)
- Lint/format: oxlint / oxfmt

## Commands

```bash
bun install
bun run dev          # dev server
bun run build        # nuxt typecheck + nuxt build + scripts/postbuild.mjs (produces .output/)
bun run test         # vitest run (tests/ — pure logic: render tree, EXIF, templates)
bun run typecheck    # nuxt typecheck (vue-tsc over app/server/shared)
bun run lint         # oxlint .
bun run fmt          # oxfmt
bun run fmt:check    # oxfmt --check
docker compose up -d # runtime-only deployment, serves .output/ on :3000
```

Always run `bun run lint`, `bun run fmt:check`, `bun run test` and
`bun run typecheck` after making changes.

## Project structure

- `app/pages/index.vue` — single-page app shell
- `app/components/` — Vue components: `EditorPanel`, `PreviewPanel`,
  `PhotoUploader`, `PhotoList`, `TemplateSelector`, `BorderSettings`,
  `TypeSettings`, `ExifPanel`, `ColorPicker`
- `app/composables/`
  - `usePhotoStore.ts` — Pinia store: photo list, selection, per-photo template
    overrides, crop state, export options
  - `useTemplate.ts` — `DEFAULT_TEMPLATE_CONFIG`, `PRESET_TEMPLATES` (classic,
    dark, minimal, film-style, card-style, nord), `getResolvedConfig()`
  - `useImageRender.ts` — client WASM render, server-side fallback, single save,
    `batchExport()` (server job + zip download)
  - `useExifReader.ts` — exifr-based EXIF extraction
- `app/types/index.ts` — app-only types (`Photo`, `Template`,
  `RenderRequest/Response`) plus re-exports of the shared types
- `shared/types.ts` — canonical shared types (`TemplateConfig`, `ExifData`,
  `PhotoCrop`, `RenderPayload`, …). `app/types/index.ts` re-exports them so app
  code keeps importing from `~/types`.
- `shared/validate.ts` — hand-rolled `validateTemplateConfig()` used by the
  render/batch endpoints to reject malformed configs with a clear 400.
- `shared/render.ts` — **the heart of the project**. `buildRenderTree()` builds
  the takumi render node tree from a config; shared verbatim between browser
  (WASM) and server (native). Types come from `shared/types.ts`. Contains
  `formatExif()`, `coverCropRect()` (cover crop/zoom geometry), and the
  footer/canvas layout math (`estimateFooterLayout`, `computeCanvasDims`,
  `layoutScaleFactor`) that the live preview also uses.
- `server/api/render.post.ts` — single-image server render endpoint
- `server/api/render/batch.post.ts`, `batch/status.get.ts`, `batch/download.get.ts`
  — batch job lifecycle (create → poll status → download zip)
- `server/utils/batchRender.ts` — in-memory job store: `createBatchJob`, `getJob`,
  `releaseJob`, `mapLimit` (concurrency 3), 10-min TTL purge (every access +
  60s timer), `MAX_JOBS` cap
- `shared/limits.ts` — size caps + `estimateBase64Bytes`, shared by the server
  (enforcement) and the client (pre-flight batch warnings)
- `server/utils/limits.ts` — request-body/photo/batch size caps (re-exported
  from shared/limits) + capped body reader (h3 has no body limit); the render
  endpoints reject oversized uploads with a clear 413
- `scripts/postbuild.mjs` — overlays takumi-js / @takumi-rs over nitro's
  trace-based externalization (nitro wrongly resolves `#backend` to WASM);
  required or native server rendering breaks

## Key conventions

- All template layout math is 1080px-base: `scaleFactor = max(w,h) / 1080` scales
  paddings, fonts, radii. Canvas modes: `original` (auto-height, no letterbox),
  `fixed` (explicit W/H), `social` (1080-wide, `socialRatio` like "1:1"/"16:9").
- Per-photo state = `templateId` + `templateOverrides`; resolved config via
  `getResolvedConfig(templateId, overrides)`. Switching template clears overrides.
- Crop/zoom: `PhotoCrop { fitMode, scale, offsetX, offsetY }`; "cover" clips via
  a rounded container; "contain" is the legacy behavior. Geometry lives in
  `coverCropRect()` in `shared/render.ts`.
- Canonical types live in `shared/types.ts` (shared verbatim by browser WASM,
  server, and app); `app/types/index.ts` re-exports them. Add new shared types
  there — never declare a duplicate interface in a component/composable.
- No comments unless they add value; the codebase uses them heavily for
  rationale, follow that style.
- Fonts come from Google Fonts (see `nuxt.config.ts`) — new font families used
  in templates must be added there.
- The docker-compose/Dockerfile is runtime-only: build on the host, mount
  `.output/` into the image.
