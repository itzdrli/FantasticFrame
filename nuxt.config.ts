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

  modules: ["@pinia/nuxt"],

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
          href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&family=Noto+Sans+SC:wght@400;700&family=Noto+Serif+SC:wght@400;700&family=Playfair+Display:wght@400;700&family=Roboto:wght@400;700&family=Source+Sans+3:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap",
        },
      ],
    },
  },
});
