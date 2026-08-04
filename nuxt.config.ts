import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  modules: ["@pinia/nuxt"],

  nitro: {
    preset: "cloudflare-pages",
    experimental: { wasm: true },
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
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;700&display=swap",
        },
      ],
    },
  },
});
