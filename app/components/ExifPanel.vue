<script setup lang="ts">
import { computed } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { formatExifForDisplay } from "~/composables/useExifReader";

const photoStore = usePhotoStore();
const { t } = useI18n();

const fieldLabels: Record<string, string> = {
  make: "exif.labels.make",
  model: "exif.labels.model",
  lensModel: "exif.labels.lensModel",
  fNumber: "exif.labels.fNumber",
  exposureTime: "exif.labels.exposureTime",
  iso: "exif.labels.iso",
  focalLength: "exif.labels.focalLength",
  focalLengthIn35mm: "exif.labels.focalLengthIn35mm",
  exposureBias: "exif.labels.exposureBias",
  dateTimeOriginal: "exif.labels.dateTimeOriginal",
  gps: "exif.labels.gps",
};

const entries = computed(() => {
  const photo = photoStore.selectedPhoto;
  if (!photo?.exif) return [];
  return Object.entries(formatExifForDisplay(photo.exif));
});
</script>

<template>
  <dl v-if="entries.length" class="flex flex-col">
    <div
      v-for="[key, val] in entries"
      :key="key"
      class="flex items-baseline justify-between gap-3 border-b border-nord-3/60 py-1.5 last:border-0"
    >
      <dt class="shrink-0 text-[11px] text-nord-4">
        {{ fieldLabels[key] ? t(fieldLabels[key]) : key }}
      </dt>
      <dd
        class="min-w-0 truncate text-right font-mono text-[11px] text-nord-6"
        :title="String(val)"
      >
        {{ val }}
      </dd>
    </div>
  </dl>
  <p v-else class="py-8 text-center text-nord-4">{{ $t("exif.noData") }}</p>
</template>
