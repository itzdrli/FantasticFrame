<script setup lang="ts">
import { computed } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { useTemplate } from "~/composables/useTemplate";
import type { TemplateConfig, ExifFieldKey } from "~/types";

const photoStore = usePhotoStore();
const { getResolvedConfig } = useTemplate();

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
  { label: "Brand", value: "make" },
  { label: "Model", value: "model" },
  { label: "Aperture", value: "fNumber" },
  { label: "Shutter", value: "exposureTime" },
  { label: "ISO", value: "iso" },
  { label: "Focal Length", value: "focalLength" },
  { label: "Date", value: "dateTimeOriginal" },
  { label: "Lens", value: "lensModel" },
];

function toggleField(value: ExifFieldKey) {
  const fields = [...visibleFields.value];
  const idx = fields.indexOf(value);
  if (idx === -1) fields.push(value);
  else fields.splice(idx, 1);
  update("visibleFields", fields);
}

const fontOptions = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Noto Sans SC", value: "'Noto Sans SC', sans-serif" },
  { label: "Noto Serif SC", value: "'Noto Serif SC', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  // ── Royalty-free (OFL/SIL) additions ─────────────────────────────────────
  { label: "Source Sans 3", value: "'Source Sans 3', sans-serif" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
  { label: "Cormorant Garamond", value: "'Cormorant Garamond', serif" },
];

const layoutOptions: { label: string; value: "horizontal" | "list" | "grid" }[] = [
  { label: "Horizontal", value: "horizontal" },
  { label: "List", value: "list" },
  { label: "Grid", value: "grid" },
];
</script>

<template>
  <div v-if="resolvedConfig" class="flex flex-col gap-5 text-sm text-nord-4">
    <!-- Typography -->
    <div class="flex flex-col gap-3">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">Typography</span>

      <!-- Font selection -->
      <div class="flex items-center justify-between">
        <span class="text-xs text-nord-4">Font Family</span>
        <select
          v-model="fontFamily"
          class="bg-nord-2 border border-nord-3 rounded-lg px-2 py-1.5 text-nord-6 text-xs focus:border-nord-8 focus:outline-none transition-colors"
        >
          <option v-for="f in fontOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </div>

      <!-- Color -->
      <div class="flex items-center justify-between">
        <span class="text-xs text-nord-4">Font Color</span>
        <ColorPicker v-model="fontColor" />
      </div>

      <!-- Parameter font size -->
      <div>
        <span class="text-xs text-nord-4 mb-1 block">Parameter Size {{ fontSize }}px</span>
        <input
          type="range"
          min="10"
          max="36"
          v-model.number="fontSize"
          class="w-full accent-nord-8"
        />
      </div>

      <!-- Logo font size (text logos only — image logos are sized by Scale % in BorderSettings) -->
      <div v-if="!hasImageLogo">
        <span class="text-xs text-nord-4 mb-1 block">Logo Size {{ modelFontSize }}px</span>
        <input
          type="range"
          min="14"
          max="48"
          v-model.number="modelFontSize"
          class="w-full accent-nord-8"
        />
      </div>
    </div>

    <!-- Layout -->
    <div class="flex flex-col gap-3">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">Layout</span>

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
          <span class="text-xs font-medium">{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <!-- Visible fields -->
    <div class="flex flex-col gap-2">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">Visible Fields</span>
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
          <span class="text-xs">{{ field.label }}</span>
        </label>
      </div>
    </div>
  </div>
  <div v-else class="text-nord-4 text-sm text-center py-8">Please select a photo first</div>
</template>
