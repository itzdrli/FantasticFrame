// Applies the persisted theme/locale on boot (client only). The pre-paint
// inline script in nuxt.config already set <html data-theme>; this keeps the
// composable refs in sync and activates the saved language.
export default defineNuxtPlugin((nuxtApp) => {
  const theme = safeReadTheme();
  if (theme) {
    document.documentElement.dataset.theme = theme;
  }

  // Must not go through useI18n() here: plugins run outside a component's
  // setup, so a composer lookup throws "Must be called at the top of a setup
  // function". The module-provided $i18n instance is order-safe.
  const saved = safeRead("ff:locale");
  const target =
    saved === "zh-CN" || saved === "en"
      ? saved
      : navigator.language?.toLowerCase().startsWith("zh")
        ? "zh-CN"
        : "en";

  const i18n = (nuxtApp as Record<string, unknown>).$i18n as
    | { setLocale(locale: string): unknown }
    | undefined;
  if (i18n && target !== "en") {
    // en is the SSR default; anything else needs an explicit switch.
    i18n.setLocale(target);
  }
});

function safeReadTheme(): string | null {
  try {
    return localStorage.getItem("ff:theme");
  } catch {
    return null;
  }
}

function safeRead(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
