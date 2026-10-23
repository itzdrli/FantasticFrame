<script setup lang="ts">
import { computed } from "vue";
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
  <UPopover :content="{ align: 'end', sideOffset: 6 }">
    <UButton
      icon="i-lucide-palette"
      color="neutral"
      variant="ghost"
      :aria-label="$t('appearance.sectionTitle')"
    >
      <span class="tabular-nums">{{ currentShort }}</span>
    </UButton>

    <template #content>
      <div class="flex w-60 flex-col gap-3 p-3">
        <div class="flex flex-col gap-1.5">
          <span class="text-[10px] font-semibold tracking-[0.12em] text-toned uppercase">
            {{ $t("appearance.theme") }}
          </span>
          <div class="grid grid-cols-2 gap-1.5">
            <button
              v-for="t in THEME_LIST"
              :key="t.id"
              type="button"
              class="flex items-center gap-1.5 border px-2 py-1.5 text-left outline-none transition-colors focus-visible:border-primary"
              :class="
                themeId === t.id
                  ? 'border-primary bg-primary/10'
                  : 'border-default hover:border-accented'
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
              <span class="truncate text-[11px] text-highlighted">{{ $t(t.labelKey) }}</span>
            </button>
          </div>
          <p class="text-[10px] text-dimmed">{{ $t("appearance.themeHint") }}</p>
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-[10px] font-semibold tracking-[0.12em] text-toned uppercase">
            {{ $t("appearance.language") }}
          </span>
          <SegmentedControl v-model="localeModel" :items="localeItems" />
        </div>
      </div>
    </template>
  </UPopover>
</template>
