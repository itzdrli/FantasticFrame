# AGENTS.md

## Project

Fantastic Frame — a photo framing tool: add a border and an EXIF caption footer
(camera, aperture, shutter, ISO, focal length, date) under photos. Templates are
just saved configs; presets exist but everything is settable by hand.

- Single **and batch** export render **client-side in the browser** via
  takumi-js WASM inside a Web Worker (photo never leaves the device); batch zips
  in the browser with fflate. Only when the browser render throws does that one
  photo fall back to `POST /api/render` (native takumi, memory only, no disk, no
  DB, no accounts). The privacy policy at legal.itzdrli.cc (separate repo) and
  the in-app privacy modal describe exactly this — keep them in sync if the
  data flow changes.
- No third-party requests at runtime: fonts are self-hosted, emoji come from the
  loaded fonts (`emoji: "from-font"`), CSP is `default-src 'self'`.
- Hosted at ff.itzdrli.cc; server in Germany (GDPR).

## Stack

- Nuxt 4 / Vue 3 / Pinia / TypeScript
- Tailwind v4 (Nord palette), Google fonts self-hosted (see Fonts below)
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
docker compose up -d --build # multi-stage image build, serves on :3000
```

Always run `bun run lint`, `bun run fmt:check`, `bun run test` and
`bun run typecheck` after making changes.

## Project structure

- `app/pages/index.vue` — single-page app shell
- `app/components/` — Vue components: `PreviewPanel`,
  `PhotoUploader`, `PhotoList`, `TemplateSelector`, `BorderSettings`,
  `TypeSettings`, `ExifPanel`, `ColorPicker`
- `app/composables/`
  - `usePhotoStore.ts` — Pinia store: photo list, selection, per-photo template
    overrides, crop state, export options. Photos hold a `File` + object URL
    (never base64); `removePhoto`/`clearAll` revoke the URLs.
  - `useIsMobile.ts` — `<768px` flag; below it the settings/EXIF drawers are
    in-flow bottom sheets (one open at a time, closed by default)
  - `useTemplate.ts` — `DEFAULT_TEMPLATE_CONFIG`, `PRESET_TEMPLATES` (classic,
    dark, minimal, film-style, card-style, nord), `getResolvedConfig()`
  - `useImageRender.ts` — render orchestration (worker → server fallback),
    single save, `batchExport()` (browser zip, one photo at a time)
  - `useExifReader.ts` — exifr-based EXIF extraction
- `app/utils/browserRender.ts` — `renderInBrowser()`: takumi WASM render shared
  by the worker and the main-thread fallback; the photo goes in via takumi's
  `images` option (no base64). `app/workers/render.worker.ts` +
  `app/utils/renderWorker.ts` run it off the main thread.
- `app/types/index.ts` — app-only types (`Photo` with `file` + `url` + `thumbUrl`,
  `RenderResponse`) plus re-exports of the shared types
- `shared/types.ts` — canonical shared types (`TemplateConfig`, `ExifData`,
  `PhotoCrop`, `RenderPayload`, …). `app/types/index.ts` re-exports them so app
  code keeps importing from `~/types`.
- `shared/validate.ts` — hand-rolled `validateTemplateConfig()` used by the
  render endpoint to reject malformed configs with a clear 400. Also bounds
  sizes/ratios and only allows `data:image/` logos (the renderer fetches any
  http(s) image `src` itself → SSRF otherwise).
- `shared/render.ts` — **the heart of the project**. `buildRenderTree()` builds
  the takumi render node tree from a config; shared verbatim between browser
  (WASM) and server (native). Types come from `shared/types.ts`. Contains
  `formatExif()`, `coverCropRect()` (cover crop/zoom geometry), and the
  footer/canvas layout math (`estimateFooterLayout`, `computeCanvasDims`,
  `layoutScaleFactor`) that the live preview also uses.
- `server/api/render.post.ts` — fallback render endpoint: rate limit + render
  slots (`server/utils/guard.ts`), header-sniffed pixel caps
  (`shared/imageSize.ts`), generic 500s
- `shared/limits.ts` — byte/pixel caps + `estimateBase64Bytes` (server enforcement)
- `shared/fonts.ts` / `shared/fontLoader.ts` — font list (single source of
  truth), `knownFamiliesIn()`, and `loadExportFonts()` which builds takumi
  `FontLoader`s (lazy, unicode-range sliced) from our own `/fonts/google/`
- `shared/mapLimit.ts` — bounded-concurrency mapper (photo import)
- `server/utils/limits.ts` — capped body reader (h3 has no body limit); the
  render endpoints reject oversized uploads with a clear 413
- `scripts/postbuild.mjs` — overlays takumi-js / @takumi-rs over nitro's
  trace-based externalization (nitro wrongly resolves `#backend` to WASM);
  required or native server rendering breaks

## Key conventions

- All template layout math is 1080px-base: `scaleFactor = max(w,h) / 1080` scales
  paddings, fonts, radii. Canvas modes: `original` (auto-height, no letterbox),
  `social` (1080-wide, `socialRatio` like "1:1"/"16:9").
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
- Fonts: takumi does NOT auto-load named families — any family not registered
  renders in the default font. Google families live in `GOOGLE_FONTS`
  (`shared/fonts.ts`); `scripts/fetch-fonts.mjs` downloads them into
  git-ignored `public/fonts/google/` (runs in `dev`/`build`/Docker). A new
  template font must be added to that list; LXGW WenKai is committed under
  `public/fonts/`.
- The Dockerfile is multi-stage: it builds `.output/` in a build stage and
  copies it into a runtime-only image.
