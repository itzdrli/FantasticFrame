<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon, NPopover } from "naive-ui";
import { Palette } from "@lucide/vue";
import { usePreferences } from "~/composables/usePreferences";

const { themeId, localeCode, setTheme, THEME_LIST } = usePreferences();

const localeItems = [
  { label: "English", value: "en" },
  { label: "简体中文", value: "zh-CN" },
];
const localeModel = computed({
  get: () => localeCode.value as string,
  set: (v: string) => (localeCode.value = v as "en" | "zh-CN"),
});
const currentShort = computed(() => (localeCode.value === "zh-CN" ? "中文" : "EN"));
</script>

<template>
  <NPopover trigger="click" placement="bottom-end">
    <template #trigger>
      <NButton quaternary size="tiny" :aria-label="$t('appearance.sectionTitle')">
        <template #icon>
          <NIcon><Palette /></NIcon>
        </template>
        <span class="tabular-nums">{{ currentShort }}</span>
      </NButton>
    </template>

    <div class="flex w-60 flex-col gap-3 p-3">
      <div class="flex flex-col gap-1.5">
        <span class="text-[12px] font-bold tracking-[0.12em] text-nord-5 uppercase">
          {{ $t("appearance.theme") }}
        </span>
        <div class="grid grid-cols-2 gap-1.5">
          <button
            v-for="t in THEME_LIST"
            :key="t.id"
            type="button"
            class="flex items-center gap-1.5 border px-2 py-1.5 text-left outline-none transition-colors focus-visible:border-nord-8"
            :class="
              themeId === t.id ? 'border-nord-8 bg-nord-8/10' : 'border-nord-3 hover:border-nord-4'
            "
            :aria-pressed="themeId === t.id"
            @click="setTheme(t.id)"
          >
            <span class="flex shrink-0">
              <span
                v-for="hex in t.swatches"
                :key="hex"
                class="-ml-0.5 size-3 border border-black/20 first:ml-0"
                :style="{ backgroundColor: hex }"
              />
            </span>
            <span class="truncate text-[13px] text-nord-6">{{ $t(t.labelKey) }}</span>
          </button>
        </div>
        <p class="text-[12px] text-nord-4/60">{{ $t("appearance.themeHint") }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <span class="text-[12px] font-bold tracking-[0.12em] text-nord-5 uppercase">
          {{ $t("appearance.language") }}
        </span>
        <SegmentedControl v-model="localeModel" :items="localeItems" />
      </div>
    </div>
  </NPopover>
</template>
