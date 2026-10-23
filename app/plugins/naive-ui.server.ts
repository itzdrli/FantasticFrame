import { setup } from "@css-render/vue3-ssr";

// Naive UI is CSS-in-JS: on the client each component mounts its own <style>.
// During SSR those styles are collected per request and emitted into <head>
// with their cssr-id, which the client recognises and reuses on hydration
// instead of injecting a duplicate (and the first paint is never unstyled).
export default defineNuxtPlugin((nuxtApp) => {
  const { collect } = setup(nuxtApp.vueApp);

  // Resolved lazily when the head renders, i.e. after the app has rendered
  useHead({
    style: () =>
      collect()
        .split("</style>")
        .map((chunk) => /<style cssr-id="([^"]*)">([\s\S]*)/.exec(chunk))
        .filter((m): m is RegExpExecArray => m !== null)
        .map(([, id, css]) => ({ "cssr-id": id, innerHTML: css })),
  });
});
