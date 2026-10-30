<script setup lang="ts">
import { computed, ref } from "vue";
import { NButton, NIcon, NInput, useMessage } from "naive-ui";
import { Copy, MapPin } from "@lucide/vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { formatExifForDisplay } from "~/composables/useExifReader";
import { reverseGeocode } from "~/utils/geocode";

const photoStore = usePhotoStore();
const { t } = useI18n();
const message = useMessage();
const { resolvedConfig } = useSelectedTemplate();

// ── Location: the caption's place text, editable per photo ─────────────────
const photo = computed(() => photoStore.selectedPhoto);
const hasGps = computed(
  () => photo.value?.exif.latitude != null && photo.value?.exif.longitude != null,
);

const location = computed({
  get: () => photo.value?.exif.location ?? "",
  set: (v: string) => {
    if (photo.value) photoStore.setPhotoLocation(photo.value.id, v || undefined);
  },
});

// Asked only on click: the lookup sends rounded coordinates to OpenStreetMap
const locating = ref(false);
async function useGpsLocation() {
  const p = photo.value;
  if (!p || p.exif.latitude == null || p.exif.longitude == null) return;
  locating.value = true;
  const res = await reverseGeocode(p.exif.latitude, p.exif.longitude);
  locating.value = false;
  if (!res.ok) message.error(t("exif.location.failed"));
  else if (!res.place) message.warning(t("exif.location.notFound"));
  else photoStore.setPhotoLocation(p.id, res.place);
}

const locationShown = computed(() =>
  (resolvedConfig.value?.visibleFields as string[] | undefined)?.includes("location"),
);

function applyLocationToAll() {
  photoStore.setPhotoLocation(undefined, photo.value?.exif.location);
}

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
  <div v-if="photo" class="mb-4 flex flex-col gap-1.5">
    <span class="text-[13px] text-nord-4">{{ $t("exif.labels.location") }}</span>
    <NInput
      v-model:value="location"
      size="tiny"
      clearable
      :placeholder="$t('exif.location.placeholder')"
      :maxlength="80"
    >
      <template #prefix>
        <NIcon class="text-nord-4/60"><MapPin /></NIcon>
      </template>
    </NInput>
    <div class="flex flex-wrap gap-x-3 gap-y-1">
      <NButton v-if="hasGps" text size="tiny" :loading="locating" @click="useGpsLocation">
        <template #icon>
          <NIcon><MapPin /></NIcon>
        </template>
        {{ $t("exif.location.auto") }}
      </NButton>
      <NButton v-if="photoStore.count > 1 && location" text size="tiny" @click="applyLocationToAll">
        <template #icon>
          <NIcon><Copy /></NIcon>
        </template>
        {{ $t("exif.location.applyAll") }}
      </NButton>
    </div>
    <p v-if="location && !locationShown" class="text-[12px] text-nord-13">
      {{ $t("exif.location.hint") }}
    </p>
    <p v-if="hasGps" class="text-[11px] text-nord-4/50">{{ $t("exif.location.credit") }}</p>
  </div>

  <dl v-if="entries.length" class="flex flex-col">
    <div
      v-for="[key, val] in entries"
      :key="key"
      class="flex items-baseline justify-between gap-3 border-b border-nord-3/60 py-1.5 last:border-0"
    >
      <dt class="shrink-0 text-[13px] text-nord-4">
        {{ fieldLabels[key] ? t(fieldLabels[key]) : key }}
      </dt>
      <dd
        class="min-w-0 truncate text-right font-mono text-[13px] text-nord-6"
        :title="String(val)"
      >
        {{ val }}
      </dd>
    </div>
  </dl>
  <p v-else class="py-8 text-center text-nord-4">{{ $t("exif.noData") }}</p>
</template>
