<script setup lang="ts">
import { computed } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { useExifReader } from "~/composables/useExifReader";

const photoStore = usePhotoStore();
const { formatExifForDisplay } = useExifReader();

const fieldLabels: Record<string, string> = {
  make: "Make",
  model: "Model",
  lensModel: "Lens",
  fNumber: "Aperture",
  exposureTime: "Shutter Speed",
  iso: "ISO",
  focalLength: "Focal Length",
  focalLengthIn35mm: "35mm Focal Length",
  exposureBias: "Exposure Bias",
  dateTimeOriginal: "Date Taken",
  gps: "GPS",
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
      <span class="text-nord-4 text-xs">{{ fieldLabels[key] || key }}</span>
      <span class="text-nord-6 text-sm font-medium truncate" :title="String(val)">{{ val }}</span>
    </div>
  </div>
  <div v-else class="text-nord-4/60 text-xs text-center py-8">No EXIF information available</div>
</template>
