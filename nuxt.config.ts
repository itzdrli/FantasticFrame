import tailwindcss from "@tailwindcss/vite";
import checker from "vite-plugin-checker";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",

  // Devtools default to on in dev and off in production; enabling them here
  // unconditionally would ship the devtools client in production builds.
  devtools: { enabled: import.meta.dev ?? process.env.NODE_ENV !== "production" },

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
    server: {
      // Allow access via Tailscale MagicDNS: short hostname "s" and *.ts.net FQDNs
      allowedHosts: ["s", ".ts.net"],
    },
    // Scoped to the client environment: Nuxt runs separate client/ssr Vite
    // environments, and the checker would otherwise spawn twice in dev.
    // (vite 8.2's EnvironmentOptions type omits `plugins`, but the runtime
    // applies it to the client environment - hence the cast.)
    $client: {
      plugins: [
        checker({
          oxlint: {
            lintCommand: "oxlint .",
          },
        }),
      ],
    } as any,
  },

  modules: ["@pinia/nuxt", "@nuxtjs/i18n"],

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

  nitro: {
    preset: "bun",
    rollupConfig: {
      plugins: [
        {
          name: "react-optional-stub",
          resolveId(id) {
            if (id === "react") return "\0react-optional-stub";
          },
          load(id) {
            if (id === "\0react-optional-stub") return "export default {};";
          },
        },
      ],
    },
  },
  app: {
    head: {
      // Apply the saved theme before first paint so the drawer/UI never
      // flashes the default Nord palette. Kept in sync with usePreferences.
      script: [
        {
          innerHTML:
            '(function(){try{var t=localStorage.getItem("ff:theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}})()',
        },
      ],
      link: [
        {
          rel: "preconnect",
          href: "https://fonts.googleapis.com",
        },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&family=DM+Sans:wght@400;700&family=IBM+Plex+Mono:wght@400;700&family=IBM+Plex+Sans:wght@400;700&family=IBM+Plex+Serif:wght@400;700&family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&family=Lora:wght@400;700&family=Noto+Sans+SC:wght@400;700&family=Noto+Serif+SC:wght@400;700&family=Outfit:wght@400;700&family=Playfair+Display:wght@400;700&family=Roboto:wght@400;700&family=Source+Sans+3:wght@400;700&family=Space+Grotesk:wght@400;700&family=ZCOOL+KuaiLe&family=ZCOOL+QingKe+HuangYou&family=ZCOOL+XiaoWei&display=swap",
        },
        {
          // MiSans — sliced web font for the UI's Chinese text (unicode-range
          // chunks load on demand, so only the used slices download).
          rel: "stylesheet",
          href: "/fonts/misans/regular/misans-regular.css",
        },
        {
          rel: "stylesheet",
          href: "/fonts/misans/semibold/misans-semibold.css",
        },
      ],
    },
  },
});
