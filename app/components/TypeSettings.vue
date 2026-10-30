<script setup lang="ts">
import { computed, h } from "vue";
import { NSelect, NSwitch, type SelectGroupOption, type SelectOption } from "naive-ui";
import type { TemplateConfig } from "~/types";

const { t } = useI18n();
const { overrides, resolvedConfig, defaults, update } = useSelectedTemplate();

/** Two-way binding to one template value: override → template → fallback */
function setting<K extends keyof TemplateConfig>(key: K, fallback: NonNullable<TemplateConfig[K]>) {
  return computed({
    get: () =>
      (overrides.value[key] ?? resolvedConfig.value?.[key] ?? fallback) as NonNullable<
        TemplateConfig[K]
      >,
    set: (v) => update(key, v),
  });
}

// Image logos ignore `modelFontSize` — the Scale % slider in the Logo section
// drives the size instead. Hide the "Logo Size" row to avoid confusion.
const hasImageLogo = computed(
  () => !!(overrides.value.logoImageUrl ?? resolvedConfig.value?.logoImageUrl),
);

const captionStyle = setting("captionStyle", "stack");
const fontFamily = setting("fontFamily", "Inter, sans-serif");
const fontColor = setting("fontColor", "#000000");
const secondaryColor = setting("secondaryColor", "#000000");
const fontSize = setting("fontSize", 14);
const modelFontSize = setting("modelFontSize", 20);
const letterSpacing = setting("letterSpacing", 0);
const infoLayout = setting("infoLayout", "horizontal");
const dateStamp = setting("dateStamp", false);
const dateStampColor = setting("dateStampColor", "#FF7A1A");

const visibleFields = computed({
  get: () =>
    (overrides.value.visibleFields ?? resolvedConfig.value?.visibleFields ?? []) as string[],
  set: (v: string[]) => update("visibleFields", v),
});

const availableFields = computed(() =>
  (
    [
      "make",
      "model",
      "lensModel",
      "focalLength",
      "fNumber",
      "exposureTime",
      "iso",
      "dateTimeOriginal",
      "location",
    ] as const
  ).map((value) => ({ label: t(`exif.labels.${value}`), value })),
);

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

const fontOptions = computed<SelectGroupOption[]>(() =>
  fontGroups.map((g) => ({
    type: "group" as const,
    key: g.label,
    label: t(g.label),
    children: g.fonts.map((f) => ({ label: f.label, value: f.value })),
  })),
);

// Each font previews itself, in the menu and in the closed select
function renderFontLabel(option: SelectOption) {
  if (option.type === "group") return option.label as string;
  return h("span", { style: { fontFamily: option.value as string } }, option.label as string);
}

const styleItems = computed(() => [
  { label: t("typography.styleStack"), value: "stack" },
  { label: t("typography.styleSplit"), value: "split" },
]);
const styleModel = computed({
  get: () => captionStyle.value as string,
  set: (v: string) => (captionStyle.value = v as "stack" | "split"),
});

const layoutItems = computed(() => [
  { label: t("typography.layoutHorizontal"), value: "horizontal" },
  { label: t("typography.layoutList"), value: "list" },
  { label: t("typography.layoutGrid"), value: "grid" },
]);
const layoutModel = computed({
  get: () => infoLayout.value as string,
  set: (v: string) => (infoLayout.value = v as "horizontal" | "list" | "grid"),
});
</script>

<template>
  <div v-if="resolvedConfig" class="flex flex-col gap-1">
    <FieldRow :label="$t('typography.captionStyle')">
      <div class="w-48"><SegmentedControl v-model="styleModel" :items="styleItems" /></div>
    </FieldRow>

    <FieldRow :label="$t('typography.fontFamily')">
      <div class="w-48">
        <NSelect
          v-model:value="fontFamily"
          :options="fontOptions"
          :render-label="renderFontLabel"
          :consistent-menu-width="false"
          size="tiny"
        />
      </div>
    </FieldRow>

    <FieldRow :label="$t('typography.fontColor')">
      <ColorPicker v-model="fontColor" />
    </FieldRow>
    <FieldRow :label="$t('typography.secondaryColor')">
      <ColorPicker v-model="secondaryColor" />
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
      :max="64"
      suffix="px"
      :default-value="defaults?.modelFontSize"
    />

    <ParamSlider
      v-model="letterSpacing"
      :label="$t('typography.letterSpacing')"
      :min="0"
      :max="12"
      suffix="px"
      :default-value="defaults?.letterSpacing"
    />

    <div v-if="captionStyle === 'stack'" class="mt-2 flex flex-col gap-1.5">
      <span class="text-[13px] text-nord-4">{{ $t("typography.layout") }}</span>
      <SegmentedControl v-model="layoutModel" :items="layoutItems" />
    </div>

    <div class="mt-2 flex flex-col gap-1.5">
      <span class="text-[13px] text-nord-4">{{ $t("typography.visibleFields") }}</span>
      <p v-if="captionStyle === 'split'" class="text-[12px] leading-snug text-nord-4/60">
        {{ $t("typography.splitHint") }}
      </p>
      <FieldOrderList v-model="visibleFields" :fields="availableFields" />
    </div>

    <FieldRow :label="$t('typography.dateStamp')" class="mt-2">
      <ColorPicker v-if="dateStamp" v-model="dateStampColor" />
      <NSwitch v-model:value="dateStamp" size="small" :aria-label="$t('typography.dateStamp')" />
    </FieldRow>
    <p v-if="dateStamp" class="text-[12px] text-nord-4/60">{{ $t("typography.dateStampHint") }}</p>
  </div>
  <p v-else class="py-6 text-center text-nord-4">{{ $t("border.selectPhotoFirst") }}</p>
</template>
