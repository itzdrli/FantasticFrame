<script setup lang="ts">
import { computed } from "vue";
import { NInput } from "naive-ui";
import type { TemplateConfig } from "~/types";

const { overrides, resolvedConfig, defaults, update } = useSelectedTemplate();
const { t } = useI18n();

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

const backgroundColor = setting("backgroundColor", "#ffffff");
const backgroundMode = setting("backgroundMode", "solid");
const backgroundBlur = setting("backgroundBlur", 40);
const backgroundDim = setting("backgroundDim", 20);
const borderRadius = setting("borderRadius", 0);
const photoShadow = setting("photoShadow", 0);
const edgeText = setting("edgeText", "");

// Three fully-decoupled sliders — no hidden "All around" sync writer, so
// dragging one never perturbs the others.
const paddingTop = setting("paddingTop", 40);
const paddingBottom = setting("paddingBottom", 40);
const paddingHorizontal = setting("paddingHorizontal", 40);

const fillItems = computed(() => [
  { label: t("border.fillSolid"), value: "solid" },
  { label: t("border.fillBlur"), value: "blur" },
]);
const fillModel = computed({
  get: () => backgroundMode.value as string,
  set: (v: string) => (backgroundMode.value = v as "solid" | "blur"),
});
</script>

<template>
  <div v-if="resolvedConfig" class="flex flex-col gap-1">
    <FieldRow :label="$t('border.fill')">
      <div class="w-48"><SegmentedControl v-model="fillModel" :items="fillItems" /></div>
    </FieldRow>
    <template v-if="backgroundMode === 'blur'">
      <ParamSlider
        v-model="backgroundBlur"
        :label="$t('border.blur')"
        :min="0"
        :max="200"
        suffix="px"
        :default-value="defaults?.backgroundBlur"
      />
      <ParamSlider
        v-model="backgroundDim"
        :label="$t('border.dim')"
        :min="0"
        :max="90"
        suffix="%"
        :default-value="defaults?.backgroundDim"
      />
    </template>
    <FieldRow v-else :label="$t('border.background')">
      <ColorPicker v-model="backgroundColor" />
    </FieldRow>
    <ParamSlider
      v-model="borderRadius"
      :label="$t('border.radius')"
      :min="0"
      :max="60"
      suffix="px"
      :default-value="defaults?.borderRadius"
    />
    <ParamSlider
      v-model="photoShadow"
      :label="$t('border.shadow')"
      :min="0"
      :max="100"
      :default-value="defaults?.photoShadow"
    />
    <ParamSlider
      v-model="paddingTop"
      :label="`${$t('border.padding')} · ${$t('border.top')}`"
      :min="0"
      :max="200"
      suffix="px"
      :default-value="defaults?.paddingTop"
    />
    <ParamSlider
      v-model="paddingBottom"
      :label="`${$t('border.padding')} · ${$t('border.bottom')}`"
      :min="0"
      :max="300"
      suffix="px"
      :default-value="defaults?.paddingBottom"
    />
    <ParamSlider
      v-model="paddingHorizontal"
      :label="`${$t('border.padding')} · ${$t('border.horizontal')}`"
      :min="0"
      :max="200"
      suffix="px"
      :default-value="defaults?.paddingHorizontal"
    />
    <div class="mt-2 flex flex-col gap-1">
      <span class="text-[13px] text-nord-4">{{ $t("border.edgeText") }}</span>
      <NInput
        v-model:value="edgeText"
        :placeholder="$t('border.edgeTextPlaceholder')"
        size="tiny"
        maxlength="60"
      />
      <p class="text-[12px] text-nord-4/60">{{ $t("border.edgeTextHint") }}</p>
    </div>
  </div>
  <p v-else class="py-6 text-center text-nord-4">{{ $t("border.selectPhotoFirst") }}</p>
</template>
