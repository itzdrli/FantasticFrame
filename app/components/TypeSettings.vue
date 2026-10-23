<script setup lang="ts">
import { computed } from "vue";
import type { SelectMenuItem } from "@nuxt/ui";
import type { ExifFieldKey } from "~/types";

const { t } = useI18n();
const { overrides, resolvedConfig, defaults, update } = useSelectedTemplate();

// Image logos ignore `modelFontSize` — the Scale % slider in the Logo section
// drives the size instead. Hide the "Logo Size" row to avoid confusion.
const hasImageLogo = computed(
  () => !!(overrides.value.logoImageUrl ?? resolvedConfig.value?.logoImageUrl),
);

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

const currentFontLabel = computed(
  () => fontGroups.flatMap((g) => g.fonts).find((f) => f.value === fontFamily.value)?.label ?? "",
);

const layoutItems = computed(() => [
  { label: t("typography.layoutHorizontal"), value: "horizontal" },
  { label: t("typography.layoutList"), value: "list" },
  { label: t("typography.layoutGrid"), value: "grid" },
]);
const layoutModel = computed({
  get: () => infoLayout.value as string,
  set: (v: string) => (infoLayout.value = v as "horizontal" | "list" | "grid"),
});

// USelectMenu takes grouped items as an array of arrays, each opening with a label row
const fontItems = computed<SelectMenuItem[][]>(() =>
  fontGroups.map((g) => [
    { type: "label" as const, label: t(g.label) },
    ...g.fonts.map((f) => ({ label: f.label, value: f.value })),
  ]),
);
</script>

<template>
  <div v-if="resolvedConfig" class="flex flex-col gap-1">
    <FieldRow :label="$t('typography.fontFamily')">
      <USelectMenu
        v-model="fontFamily"
        :items="fontItems"
        value-key="value"
        variant="subtle"
        :search-input="false"
        class="w-40"
        :ui="{ content: 'min-w-48' }"
      >
        <template #default>
          <span class="truncate" :style="{ fontFamily }">{{ currentFontLabel }}</span>
        </template>
        <template #item-label="{ item }">
          <span :style="{ fontFamily: (item as { value: string }).value }">
            {{ (item as { label: string }).label }}
          </span>
        </template>
      </USelectMenu>
    </FieldRow>

    <FieldRow :label="$t('typography.fontColor')">
      <ColorPicker v-model="fontColor" />
    </FieldRow>

    <ParamSlider
      v-model="fontSize"
      :label="$t('typography.paramSize')"
      :min="10"
      :max="36"
      suffix="px"
      :default-value="defaults?.fontSize"
    />

    <!-- Text logos only — image logos are sized by Scale % in the Logo section -->
    <ParamSlider
      v-if="!hasImageLogo"
      v-model="modelFontSize"
      :label="$t('typography.logoSize')"
      :min="14"
      :max="48"
      suffix="px"
      :default-value="defaults?.modelFontSize"
    />

    <div class="mt-2 flex flex-col gap-1.5">
      <span class="text-[11px] text-muted">{{ $t("typography.layout") }}</span>
      <SegmentedControl v-model="layoutModel" :items="layoutItems" />
    </div>

    <div class="mt-2 flex flex-col gap-1.5">
      <span class="text-[11px] text-muted">{{ $t("typography.visibleFields") }}</span>
      <div class="grid grid-cols-2 gap-x-2 gap-y-1.5">
        <UCheckbox
          v-for="field in availableFields"
          :key="field.value"
          :model-value="visibleFields.includes(field.value)"
          :label="$t(field.label)"
          size="xs"
          :ui="{ label: 'text-[11px] font-normal text-toned' }"
          @update:model-value="toggleField(field.value)"
        />
      </div>
    </div>
  </div>
  <p v-else class="py-6 text-center text-muted">{{ $t("border.selectPhotoFirst") }}</p>
</template>
