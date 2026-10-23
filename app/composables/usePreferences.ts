import { computed } from "vue";
import { PALETTES, type ThemeId } from "~/utils/themes";

/**
 * App-wide appearance preferences (theme + locale).
 *
 * Persisted under `ff:theme` / `ff:locale` in localStorage. The theme is
 * applied by setting `<html data-theme>` — main.css maps every nord-* role to
 * a palette per theme, and app.vue feeds the same palette to Naive UI. A tiny
 * inline script in nuxt.config applies the saved theme before first paint;
 * this composable owns it from then on.
 */

export interface ThemeMeta {
  id: ThemeId;
  /** i18n message key, e.g. appearance.themes.nord */
  labelKey: string;
  /** Small hex strips for the picker swatch: page, panel, accent, text */
  swatches: string[];
}

export const THEME_LIST: ThemeMeta[] = (Object.keys(PALETTES) as ThemeId[]).map((id) => {
  const c = PALETTES[id].colors;
  return { id, labelKey: `appearance.themes.${id}`, swatches: [c[0]!, c[1]!, c[8]!, c[6]!] };
});

const THEME_KEY = "ff:theme";
const LOCALE_KEY = "ff:locale";

export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;
export type LocaleCode = (typeof SUPPORTED_LOCALES)[number];

/**
 * The active theme — module-level so every usePreferences() consumer shares
 * one source of truth. Seeded from `<html data-theme>` on the client: the
 * pre-paint inline script (nuxt.config) already applied the saved theme there
 * before this module runs, so the UI indicator matches what is rendered
 * without re-reading localStorage. Server markup always starts at the graphite
 * default (the theme menu is client-only, so no hydration concern).
 */
const themeId = ref<ThemeId>(import.meta.client ? (readAppliedTheme() ?? "graphite") : "graphite");

function readAppliedTheme(): ThemeId | null {
  const applied = document.documentElement.dataset.theme;
  if (!applied) return null;
  return THEME_LIST.some((t) => t.id === applied) ? (applied as ThemeId) : null;
}

function safeWrite(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage may be unavailable (private mode) — theme still works per-tab */
  }
}

export function usePreferences() {
  const { locale, setLocale } = useI18n();

  const localeCode = computed<LocaleCode>({
    get: () => (locale.value === "zh-CN" ? "zh-CN" : "en"),
    set: (code: LocaleCode) => {
      if (code === localeCode.value) return;
      safeWrite(LOCALE_KEY, code);
      // Must go through the composer's setLocale (async): file-based locales
      // load their messages on demand. A direct `locale.value =` switch would
      // render every $t() as its raw key (messages never arrive).
      void setLocale(code);
    },
  });

  function applyTheme(id: ThemeId) {
    themeId.value = id;
    document.documentElement.dataset.theme = id;
    safeWrite(THEME_KEY, id);
  }

  function setTheme(id: ThemeId) {
    if (id === themeId.value) return;
    applyTheme(id);
  }

  return {
    themeId,
    localeCode,
    setTheme,
    THEME_LIST,
  };
}
