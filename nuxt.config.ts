import tailwindcss from '@tailwindcss/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [
      tailwindcss(),
    ],
    // electrobun/view 仅在 Electrobun webview 运行时有效，
    // SSR 构建时需将其排除，避免服务端打包失败。
    // 运行时 guard 已在 useElectrobunRpc.ts 中通过 typeof window 检测。
    ssr: {
      external: ['electrobun', 'electrobun/view', 'electrobun/bun'],
    },
  },

  modules: [
    '@pinia/nuxt',
  ],
  app: {
    head: {
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;700&display=swap',
        },
      ],
    },
  },
})
