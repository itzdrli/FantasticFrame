# Fantastic Frame

Add a border and an EXIF caption footer — camera, aperture, shutter, ISO, focal
length, date, whichever you want to show — under your photos. A few templates
ship built-in; each one is just a saved config, so anything you see in a preset
can also be set by hand.

Rendering — single and batch (zip) — runs entirely in your browser through
WASM in a Web Worker, so photos never leave your device. Only if the browser
can't render a photo does that one photo fall back to the server, which works in
memory only and writes nothing to disk. Fonts are self-hosted (no Google Fonts
request). No accounts, no cookies, no analytics.

Hosted at [ff.itzdrli.cc](https://ff.itzdrli.cc). Full policy at
[legal.itzdrli.cc](https://legal.itzdrli.cc); the server sits in Germany, GDPR.

## Self-host

The Dockerfile is multi-stage (build, then a runtime-only image):

```bash
docker compose up -d --build   # serves on :3000
```

Without Docker: `bun install && bun run build && bun .output/server/index.mjs`.

The Google font families are downloaded once by `scripts/fetch-fonts.mjs` into
`public/fonts/google/` (git-ignored); `bun run dev` and `bun run build` run it
automatically, or run `bun run fonts` yourself. Needs network access at build
time only.

Drop the Traefik labels in `docker-compose.yml` if you don't run a reverse
proxy.

## Stack

Nuxt 4 / Vue 3 / Pinia. Nuxt UI v4 on Tailwind v4, with a Lightroom-style
neutral "Graphite" default theme (Nord, Frost, Sand and Dusk are selectable). Rendering via
takumi-js (WASM in the browser, native on the server fallback). EXIF parsed by exifr.
