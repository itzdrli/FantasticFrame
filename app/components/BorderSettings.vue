<script setup lang="ts">
import { computed } from "vue";

const { overrides, resolvedConfig, update } = useSelectedTemplate();

// ── Corner Radius ───────────────────────────────────────────────────────────
const borderRadius = computed({
  get: () => overrides.value.borderRadius ?? resolvedConfig.value?.borderRadius ?? 0,
  set: (v) => update("borderRadius", v),
});

// ── Background ─────────────────────────────────────────────────────────────
const backgroundColor = computed({
  get: () => overrides.value.backgroundColor ?? resolvedConfig.value?.backgroundColor ?? "#ffffff",
  set: (v) => update("backgroundColor", v),
});

// ── Padding (independent) ───────────────────────────────────────────────────
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
  <div v-if="resolvedConfig" class="flex flex-col gap-5 text-sm text-nord-4">
    <!-- Background -->
    <div class="flex items-center justify-between">
      <span class="text-nord-5 font-medium">{{ $t("border.background") }}</span>
      <ColorPicker v-model="backgroundColor" />
    </div>

    <!-- Corner Radius -->
    <div class="flex flex-col gap-3">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">{{
        $t("border.cornerRadius")
      }}</span>
      <SliderField
        v-model="borderRadius"
        :label="$t('border.radius')"
        :min="0"
        :max="60"
        suffix="px"
      />
    </div>

    <!-- Padding -->
    <div class="flex flex-col gap-3">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">{{
        $t("border.padding")
      }}</span>
      <SliderField v-model="paddingTop" :label="$t('border.top')" :min="0" :max="200" suffix="px" />
      <SliderField
        v-model="paddingBottom"
        :label="$t('border.bottom')"
        :min="0"
        :max="300"
        suffix="px"
      />
      <SliderField
        v-model="paddingHorizontal"
        :label="$t('border.horizontal')"
        :min="0"
        :max="200"
        suffix="px"
      />
    </div>

    <CanvasSettings />

    <LogoSettings />
  </div>
  <div v-else class="text-nord-4 text-sm text-center py-8">{{ $t("border.selectPhotoFirst") }}</div>
</template>
