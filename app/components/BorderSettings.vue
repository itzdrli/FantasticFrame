<script setup lang="ts">
import { computed } from "vue";

const { overrides, resolvedConfig, defaults, update } = useSelectedTemplate();

const borderRadius = computed({
  get: () => overrides.value.borderRadius ?? resolvedConfig.value?.borderRadius ?? 0,
  set: (v) => update("borderRadius", v),
});
const backgroundColor = computed({
  get: () => overrides.value.backgroundColor ?? resolvedConfig.value?.backgroundColor ?? "#ffffff",
  set: (v) => update("backgroundColor", v),
});

// Three fully-decoupled sliders — no hidden "All around" sync writer, so
// dragging one never perturbs the others.
const paddingTop = computed({
  get: () => overrides.value.paddingTop ?? resolvedConfig.value?.paddingTop ?? 40,
  set: (v) => update("paddingTop", v),
});
const paddingBottom = computed({
  get: () => overrides.value.paddingBottom ?? resolvedConfig.value?.paddingBottom ?? 40,
  set: (v) => update("paddingBottom", v),
});
const paddingHorizontal = computed({
  get: () => overrides.value.paddingHorizontal ?? resolvedConfig.value?.paddingHorizontal ?? 40,
  set: (v) => update("paddingHorizontal", v),
});
</script>

<template>
  <div v-if="resolvedConfig" class="flex flex-col gap-1">
    <FieldRow :label="$t('border.background')">
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
  </div>
  <p v-else class="py-6 text-center text-muted">{{ $t("border.selectPhotoFirst") }}</p>
</template>
