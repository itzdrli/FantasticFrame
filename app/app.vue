<script setup lang="ts">
import { en, zh_cn } from "@nuxt/ui/locale";

const { locale } = useI18n();
const uiLocale = computed(() => (locale.value === "zh-CN" ? zh_cn : en));
</script>

<template>
  <UApp
    :locale="uiLocale"
    :toaster="{ position: 'bottom-right', max: 3 }"
    :tooltip="{ delayDuration: 500 }"
  >
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </UApp>
</template>
