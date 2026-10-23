<script setup lang="ts">
import { computed } from "vue";
import { useImageRender } from "~/composables/useImageRender";

const { exportFormat, exportQuality } = useImageRender();
const { t } = useI18n();

const formatItems = [
  { label: "PNG", value: "png" },
  { label: "JPEG", value: "jpeg" },
  { label: "WebP", value: "webp" },
];
const formatModel = computed({
  get: () => exportFormat.value as string,
  set: (v: string) => (exportFormat.value = v as "png" | "jpeg" | "webp"),
});

const hint = computed(() =>
  exportFormat.value === "png"
    ? t("export.pngLossless")
    : exportFormat.value === "webp"
      ? t("export.webpHint")
      : t("export.jpegHint"),
);
</script>

<template>
  <div class="flex flex-col gap-1">
    <FieldRow :label="$t('export.format')">
      <div class="w-40"><SegmentedControl v-model="formatModel" :items="formatItems" /></div>
    </FieldRow>
    <ParamSlider
      v-if="exportFormat !== 'png'"
      v-model="exportQuality"
      :label="$t('export.quality')"
      :min="50"
      :max="100"
      suffix="%"
    />
    <p class="text-[10px] leading-snug text-nord-4/60">{{ hint }}</p>
  </div>
</template>
