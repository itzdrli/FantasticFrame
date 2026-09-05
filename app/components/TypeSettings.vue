<script setup lang="ts">
import { computed } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { getResolvedConfig } from "~/composables/useTemplate";
import type { TemplateConfig, ExifFieldKey } from "~/types";

const photoStore = usePhotoStore();

const selectedPhoto = computed(() => photoStore.selectedPhoto);
const templateId = computed(() => selectedPhoto.value?.templateId || "classic");
const overrides = computed(() => selectedPhoto.value?.templateOverrides || {});
const resolvedConfig = computed(() =>
  selectedPhoto.value ? getResolvedConfig(templateId.value, overrides.value) : null,
);

// Image logos ignore `modelFontSize` — the Scale % slider in BorderSettings
// drives the size instead. Hide the "Logo Text Size" row to avoid confusion.
const hasImageLogo = computed(
  () => !!(overrides.value.logoImageUrl ?? resolvedConfig.value?.logoImageUrl),
);

const update = <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => {
  if (selectedPhoto.value) {
    photoStore.updatePhotoOverrides(selectedPhoto.value.id, { [key]: value });
  }
};

const fontFamily = computed({
  get: () => overrides.value.fontFamily ?? resolvedConfig.value?.fontFamily ?? "Inter, sans-serif",
  set: (v) => update("fontFamily", v),
});
const fontColor = computed({
  get: () => overrides.value.fontColor ?? resolvedConfig.value?.fontColor ?? "#000000",
  set: (v) => update("fontColor", v),
});
const fontSize = computed({
  get: () => overrides.value.fontSize ?? resolvedConfig.value?.fontSize ?? 14,
  set: (v) => update("fontSize", v),
});
const modelFontSize = computed({
  get: () => overrides.value.modelFontSize ?? resolvedConfig.value?.modelFontSize ?? 20,
  set: (v) => update("modelFontSize", v),
});
const infoLayout = computed({
  get: () => overrides.value.infoLayout ?? resolvedConfig.value?.infoLayout ?? "horizontal",
  set: (v) => update("infoLayout", v),
});
const visibleFields = computed(
  () => overrides.value.visibleFields ?? resolvedConfig.value?.visibleFields ?? [],
);

const availableFields: { label: string; value: ExifFieldKey }[] = [
  { label: "exif.labels.make", value: "make" },
  { label: "exif.labels.model", value: "model" },
  { label: "exif.labels.fNumber", value: "fNumber" },
  { label: "exif.labels.exposureTime", value: "exposureTime" },
  { label: "exif.labels.iso", value: "iso" },
  { label: "exif.labels.focalLength", value: "focalLength" },
  { label: "exif.labels.dateTimeOriginal", value: "dateTimeOriginal" },
  { label: "exif.labels.lensModel", value: "lensModel" },
];

function toggleField(value: ExifFieldKey) {
  const fields = [...visibleFields.value];
  const idx = fields.indexOf(value);
  if (idx === -1) fields.push(value);
  else fields.splice(idx, 1);
  update("visibleFields", fields);
}

const fontGroups: { label: string; fonts: { label: string; value: string }[] }[] = [
  {
    label: "typography.groups.sans",
    fonts: [
      { label: "Inter", value: "Inter, sans-serif" },
      { label: "IBM Plex Sans", value: "'IBM Plex Sans', sans-serif" },
      { label: "DM Sans", value: "'DM Sans', sans-serif" },
      { label: "Outfit", value: "Outfit, sans-serif" },
      { label: "Roboto", value: "Roboto, sans-serif" },
      { label: "Source Sans 3", value: "'Source Sans 3', sans-serif" },
      { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
    ],
  },
  {
    label: "typography.groups.serif",
    fonts: [
      { label: "IBM Plex Serif", value: "'IBM Plex Serif', serif" },
      { label: "Lora", value: "Lora, serif" },
      { label: "Playfair Display", value: "'Playfair Display', serif" },
      { label: "Cormorant Garamond", value: "'Cormorant Garamond', serif" },
      { label: "Georgia", value: "Georgia, serif" },
    ],
  },
  {
    label: "typography.groups.mono",
    fonts: [
      { label: "IBM Plex Mono", value: "'IBM Plex Mono', monospace" },
      { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
    ],
  },
  {
    label: "typography.groups.cjk",
    fonts: [
      { label: "LXGW WenKai", value: "'LXGW WenKai', serif" },
      { label: "Noto Sans SC", value: "'Noto Sans SC', sans-serif" },
      { label: "Noto Serif SC", value: "'Noto Serif SC', serif" },
    ],
  },
  {
    label: "typography.groups.cjkDisplay",
    fonts: [
      { label: "ZCOOL XiaoWei", value: "'ZCOOL XiaoWei', serif" },
      { label: "ZCOOL QingKe HuangYou", value: "'ZCOOL QingKe HuangYou', sans-serif" },
      { label: "ZCOOL KuaiLe", value: "'ZCOOL KuaiLe', sans-serif" },
    ],
  },
];

const layoutOptions: { label: string; value: "horizontal" | "list" | "grid" }[] = [
  { label: "typography.layoutHorizontal", value: "horizontal" },
  { label: "typography.layoutList", value: "list" },
  { label: "typography.layoutGrid", value: "grid" },
];
</script>

<template>
  <div v-if="resolvedConfig" class="flex flex-col gap-5 text-sm text-nord-4">
    <!-- Typography -->
    <div class="flex flex-col gap-3">
      <!-- Font selection -->
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs text-nord-4 shrink-0">{{ $t("typography.fontFamily") }}</span>
        <div class="flex items-center gap-2 min-w-0 flex-1 justify-end">
          <!-- Live preview of the current selection, drawn in its own face -->
          <span
            class="w-7 h-6 shrink-0 flex items-center justify-center rounded border border-nord-3/70 bg-nord-2 text-[13px] leading-none text-nord-6 overflow-hidden"
            :style="{ fontFamily: fontFamily }"
            aria-hidden="true"
          >
            Ag
          </span>
          <select
            v-model="fontFamily"
            class="min-w-0 w-32 bg-nord-2 border border-nord-3 rounded-lg px-2 py-1.5 text-nord-6 text-xs focus:border-nord-8 focus:outline-none transition-colors"
          >
            <optgroup v-for="group in fontGroups" :key="group.label" :label="$t(group.label)">
              <option v-for="f in group.fonts" :key="f.value" :value="f.value">
                {{ f.label }}
              </option>
            </optgroup>
          </select>
        </div>
      </div>

      <!-- Color -->
      <div class="flex items-center justify-between">
        <span class="text-xs text-nord-4">{{ $t("typography.fontColor") }}</span>
        <ColorPicker v-model="fontColor" />
      </div>

      <SliderField
        v-model="fontSize"
        :label="$t('typography.paramSize')"
        :min="10"
        :max="36"
        suffix="px"
      />

      <!-- Logo font size (text logos only — image logos are sized by Scale % in BorderSettings) -->
      <SliderField
        v-if="!hasImageLogo"
        v-model="modelFontSize"
        :label="$t('typography.logoSize')"
        :min="14"
        :max="48"
        suffix="px"
      />
    </div>

    <!-- Layout -->
    <div class="flex flex-col gap-3">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">{{
        $t("typography.layout")
      }}</span>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="opt in layoutOptions"
          :key="opt.value"
          @click="infoLayout = opt.value"
          class="flex items-center justify-center p-2.5 rounded-lg border transition-all text-center"
          :class="
            infoLayout === opt.value
              ? 'border-nord-8 bg-nord-8/10 text-nord-8'
              : 'border-nord-3 bg-nord-2 text-nord-4 hover:border-nord-9 hover:text-nord-9'
          "
        >
          <span class="text-xs font-medium">{{ $t(opt.label) }}</span>
        </button>
      </div>
    </div>

    <!-- Visible fields -->
    <div class="flex flex-col gap-2">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">{{
        $t("typography.visibleFields")
      }}</span>
      <div class="grid grid-cols-2 gap-1.5">
        <label
          v-for="field in availableFields"
          :key="field.value"
          class="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg transition-colors"
          :class="
            visibleFields.includes(field.value)
              ? 'bg-nord-8/10 text-nord-8'
              : 'text-nord-4 hover:bg-nord-2'
          "
        >
          <input
            type="checkbox"
            :checked="visibleFields.includes(field.value)"
            @change="toggleField(field.value)"
            class="accent-nord-8 w-3.5 h-3.5 rounded"
          />
          <span class="text-xs">{{ $t(field.label) }}</span>
        </label>
      </div>
    </div>
  </div>
  <div v-else class="text-nord-4 text-sm text-center py-8">{{ $t("border.selectPhotoFirst") }}</div>
</template>
