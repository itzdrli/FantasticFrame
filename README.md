# Fantastic Frame

Add a border and an EXIF caption footer — camera, aperture, shutter, ISO, focal
length, date, whichever you want to show — under your photos. A few templates
ship built-in; each one is just a saved config, so anything you see in a preset
can also be set by hand.

Single export runs entirely in your browser through WASM, so the photo never
leaves your device. Batch export does upload (the server renders), but it keeps
the bytes in memory only, never writes to disk, never hits a database, and
drops the job the moment you've downloaded the zip — or after ten minutes if
you walk away. No accounts, no cookies, no analytics.

Hosted at [ff.itzdrli.cc](https://ff.itzdrli.cc). Full policy at
[legal.itzdrli.cc](https://legal.itzdrli.cc); the server sits in Germany, GDPR.

## Self-host

Build on the host, not in Docker — the Dockerfile is runtime-only:

```bash
bun install
bun run build          # produces .output/
docker compose up -d   # serves on :3000
```

Drop the Traefik labels in `docker-compose.yml` if you don't run a reverse
proxy.

## Stack

Nuxt 4 / Vue 3 / Pinia. Tailwind v4 on the Nord palette. Rendering via
takumi-js (WASM in the browser, native on the server). EXIF parsed by exifr.
