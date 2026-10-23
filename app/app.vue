<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import {
  NConfigProvider,
  NMessageProvider,
  darkTheme,
  dateEnUS,
  dateZhCN,
  enUS,
  zhCN,
} from "naive-ui";
import { usePreferences } from "~/composables/usePreferences";
import { PALETTES, naiveThemeOverrides, type ThemeId } from "~/utils/themes";

const { locale } = useI18n();
const { themeId } = usePreferences();

// Naive UI writes theme colours into inline CSS variables, and production
// hydration never patches mismatched attributes. The server always renders
// graphite, so hydrate with graphite too and switch to the saved theme once
// mounted (the pre-paint script already themes everything Tailwind draws).
const activeTheme = ref<ThemeId>("graphite");
onMounted(() => watch(themeId, (id) => (activeTheme.value = id), { immediate: true }));

const theme = computed(() => (PALETTES[activeTheme.value].dark ? darkTheme : null));
const themeOverrides = computed(() => naiveThemeOverrides(activeTheme.value));
const naiveLocale = computed(() => (locale.value === "zh-CN" ? zhCN : enUS));
const naiveDateLocale = computed(() => (locale.value === "zh-CN" ? dateZhCN : dateEnUS));
</script>

<template>
  <NConfigProvider
    abstract
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="naiveLocale"
    :date-locale="naiveDateLocale"
  >
    <NMessageProvider placement="bottom-right" :max="3">
      <NuxtRouteAnnouncer />
      <NuxtPage />
    </NMessageProvider>
  </NConfigProvider>
</template>
