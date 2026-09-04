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
  <div v-if="entries.length" class="grid grid-cols-2 gap-x-4 gap-y-3">
    <div v-for="[key, val] in entries" :key="key" class="flex flex-col min-w-0">
      <span class="text-nord-4 text-xs">{{ fieldLabels[key] ? t(fieldLabels[key]) : key }}</span>
      <span class="text-nord-6 text-sm font-medium truncate" :title="String(val)">{{ val }}</span>
    </div>
  </div>
  <div v-else class="text-nord-4/60 text-xs text-center py-8">{{ $t("exif.noData") }}</div>
</template>
