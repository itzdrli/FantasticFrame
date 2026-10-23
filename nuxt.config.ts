import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",

  // Devtools default to on in dev and off in production; enabling them here
  // unconditionally would ship the devtools client in production builds.
  devtools: { enabled: import.meta.dev ?? process.env.NODE_ENV !== "production" },

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
    // Naive UI's deep CJS chain (date-fns-tz, vueuc) trips dev pre-bundling
    // otherwise and reloads the page on first visit.
    optimizeDeps: { include: ["naive-ui", "vueuc", "date-fns-tz"] },
    server: {
      // Allow access via Tailscale MagicDNS: short hostname "s" and *.ts.net FQDNs
      allowedHosts: ["s", ".ts.net"],
    },
  },

  modules: ["@pinia/nuxt", "@nuxtjs/i18n"],

  build: {
    // Naive UI ships ESM that imports CJS-only helpers; SSR needs these
    // transpiled or the server bundle fails with "require is not defined".
    transpile: ["naive-ui", "vueuc", "@css-render/vue3-ssr"],
  },

  i18n: {
    // Single-page app: no URL prefixes. The locale is picked by
    // usePreferences (localStorage first, browser language second) and set
    // programmatically on mount; server always renders the default.
    strategy: "no_prefix",
    defaultLocale: "en",
    detectBrowserLanguage: false,
    compilation: {
      // svgPlaceholder / errSvgInvalid intentionally contain literal <svg>
      // markup for the paste textarea; silence the HTML sniffing warning.
      strictMessage: false,
    },
    langDir: "locales",
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "zh-CN", name: "简体中文", file: "zh-CN.json" },
    ],
  },

  // Production-only: the dev server needs eval/websockets for HMR.
  // Everything the page loads is same-origin (fonts, WASM, workers, blob:
  // previews), so the policy can be strict. 'unsafe-inline' is needed for
  // Nuxt's inline payload/theme scripts; 'wasm-unsafe-eval' for takumi WASM.
  $production: {
    nitro: {
      routeRules: {
        "/**": {
          headers: {
            "Content-Security-Policy":
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
            "X-Content-Type-Options": "nosniff",
            "Referrer-Policy": "no-referrer",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Strict-Transport-Security": "max-age=31536000",
          },
        },
      },
    },
  },

  nitro: {
    preset: "bun",
    rollupConfig: {
      plugins: [
        {
          name: "react-optional-stub",
          resolveId(id: string) {
            if (id === "react") return "\0react-optional-stub";
          },
          load(id: string) {
            if (id === "\0react-optional-stub") return "export default {};";
          },
        },
      ],
    },
  },
  app: {
    head: {
      viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
      // Apply the saved theme before first paint so the drawer/UI never
      // flashes the default Nord palette. Kept in sync with usePreferences.
      script: [
        {
          innerHTML:
            '(function(){try{var t=localStorage.getItem("ff:theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}})()',
        },
      ],
      link: [
        // SVG first for modern browsers; favicon.ico (PNG-in-ICO) for the rest
        { rel: "icon", type: "image/svg+xml", href: "/logo.svg" },
        { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
        { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
        {
          // Google families are self-hosted: scripts/fetch-fonts.mjs downloads
          // them into public/fonts/google at build time, so visitors never
          // contact Google (see the privacy policy).
          rel: "stylesheet",
          href: "/fonts/google/fonts.css",
        },
      ],
    },
  },
});
