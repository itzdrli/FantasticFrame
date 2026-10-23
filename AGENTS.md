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
- Naive UI (CSS-in-JS, imported per component from `naive-ui`) for controls;
  Tailwind v4 (`@tailwindcss/vite`) for layout and colours. Icons from
  `@lucide/vue` (bundled components). Google fonts self-hosted (see Fonts below)
- Keep `nuxt`, `vue` and `vue-router` versions aligned: a nested duplicate (`node_modules/nuxt/node_modules/vue`) silently
  drops `$t` and the nitro config types and floods `typecheck` with errors.
  If that happens, delete the nested dir and `bun install`.
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
- `app/components/` — Vue components. Right panel (Lightroom-style):
  `SettingsPanel` (collapsible `PanelSection`s on desktop; icon tab bar +
  collapsible bottom sheet on phones) hosting `TemplateSelector`,
  `CanvasSettings`, `BorderSettings` (frame), `TypeSettings` (caption),
  `LogoSettings`, `ExportSettings`, `StyleSyncBar`, `ExifPanel`. Building
  blocks: `ParamSlider` (label scrub, double-click reset, changed highlight,
  editable value), `FieldRow`, `SegmentedControl`, `ColorPicker`,
  `FieldOrderList` (drag/arrow reordering of visible EXIF fields). Elsewhere:
  `PreviewPanel`/`PreviewToolbar`, `PhotoUploader`, `PhotoList`, `AppearanceMenu`
- `app/components/RenderNodeView.vue` — draws a takumi node tree as DOM. The
  live preview and the preset thumbnails render `buildRenderTree()` output
  through it, so there is no second layout implementation: a new template
  feature goes into `shared/render.ts` only and shows up in both.
- `app/app.vue` — `NConfigProvider` (theme, overrides, locale) + `NMessageProvider`
- `app/utils/themes.ts` — palettes per theme + `naiveThemeOverrides()` (editor
  density: 28px `tiny` controls, 13px type, 2px corners; every colour token
  mapped onto the nord-* roles)
- `app/plugins/naive-ui.server.ts` — collects Naive's SSR styles into `<head>`
- `app/composables/`
  - `usePhotoStore.ts` — Pinia store: photo list, selection, per-photo template
    overrides, crop state, export options. Photos hold a `File` + object URL
    (never base64); `removePhoto`/`clearAll` revoke the URLs.
  - `useIsMobile.ts` — `<768px` flag; below it the settings/EXIF drawers are
    in-flow bottom sheets (one open at a time, closed by default)
  - `useTemplate.ts` — `DEFAULT_TEMPLATE_CONFIG`, `PRESET_TEMPLATES` /
    `PRESET_LIST` (modern: leica, gallery, frosted, card, cinema, magazine;
    retro: polaroid, datestamp, negative; names in i18n `presets.*`),
    `DEFAULT_TEMPLATE_ID`, `getResolvedConfig()`
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
  layout math (`computeFrameGeometry`, `estimateFooterLayout`,
  `computeCanvasDims`, `layoutScaleFactor`). `buildRenderTree(payload,
{ scale })` builds the preview at on-screen size; the footer is estimated at
  full size and scaled so the preview never drifts from the export. The
  caption band scales by canvas width (`captionScale`), borders by the long
  edge. Template effects: blurred-photo background (two blur layers over the
  photo's average tone, `RenderPayload.photoTone`, computed at import —
  takumi blurs within the canvas so edges fade; never put a sharp copy
  underneath, it shows through the corners), photo shadow, `captionStyle`
  "split" (watermark bar, fields slotted by `splitCaption()`), secondary
  colour, letter spacing, DSEG7 date stamp, film edge text.
- `server/api/render.post.ts` — fallback render endpoint: rate limit + render
  slots (`server/utils/guard.ts`), header-sniffed pixel caps
  (`shared/imageSize.ts`), generic 500s
- `shared/limits.ts` — byte/pixel caps + `estimateBase64Bytes` (server enforcement)
- `shared/fonts.ts` / `shared/fontLoader.ts` — font list (single source of
  truth), `knownFamiliesIn()`, and `loadExportFonts()` which builds takumi
  `FontLoader`s (lazy, unicode-range sliced) from our own `/fonts/google/`
- `shared/logos.ts` — brand logo library (`LOGO_LIBRARY`, `matchLogoId()`
  from EXIF make). Files are normalised single-colour SVGs in `public/logos/`
  (sources and licences in `public/logos/SOURCES.md`; a new logo must carry
  no scripts, styles or external refs — `tests/logos.test.ts` checks).
  `logoAuto` is resolved in the app (`app/composables/useLogoLibrary.ts`,
  `renderConfigFor()` / `prefetchAutoLogos()`) into a plain recoloured
  `logoImageUrl` before preview or export; the renderer never sees it.
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
- UI: use Naive UI components (`NButton size="tiny"`, `NSlider`,
  `NInputNumber`, `NTabs`, `NPopover`, `NModal`, `useMessage`, …), imported
  explicitly from `naive-ui`, not hand-rolled controls. Colours in templates
  are the `nord-*` luminance roles as Tailwind classes (0 page … 6 strong
  text, 8 accent, 11 danger; e.g. `text-nord-4/60` for dimmed text). Naive
  cannot read CSS variables, so every palette exists twice: `main.css`
  (`--color-nord-*`, switched by `<html data-theme>`) and `utils/themes.ts`
  (fed to `NConfigProvider`); `tests/themes.test.ts` fails if they drift.
  Naive's styles are unlayered and beat Tailwind's `@layer` utilities: don't
  put `hidden`/`w-*`/`h-*` on a Naive component root that sets the same
  property — wrap it in an element instead. Icons: `<NIcon><Foo /></NIcon>`
  with `Foo` from `@lucide/vue` (no brand icons; GitHub is an inline SVG).
- No comments unless they add value; the codebase uses them heavily for
  rationale, follow that style.
- Fonts: takumi does NOT auto-load named families — any family not registered
  renders in the default font. Google families live in `GOOGLE_FONTS`
  (`shared/fonts.ts`); `scripts/fetch-fonts.mjs` downloads them into
  git-ignored `public/fonts/google/` (runs in `dev`/`build`/Docker). A new
  template font must be added to that list; LXGW WenKai and DSEG7 Classic
  (date stamp) are committed under `public/fonts/` (`SELF_HOSTED_FONTS`).
  Export fonts come from `exportFontFamily(cfg)`. Never pass `weight` in the
  takumi font loaders: takumi then lets one weight overwrite the other, and
  bold text renders regular (or the reverse) depending on load order.
- The Dockerfile is multi-stage: it builds `.output/` in a build stage and
  copies it into a runtime-only image.
