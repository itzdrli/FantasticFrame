<script setup lang="ts">
import { computed } from "vue";
import { NColorPicker } from "naive-ui";

const model = defineModel<string>({ default: "#000000" });

// Neutrals first (dark → light) then a hue progression, so the grid reads as
// one ramp. Picking a swatch is the common case for caption/background colours.
const PRESET_COLORS = [
  "#000000",
  "#18181B",
  "#1A1A1A",
  "#2C2C2E",
  "#2E3440",
  "#3B4252",
  "#434C5E",
  "#4C566A",
  "#6B6B6B",
  "#8A8A85",
  "#ABB8C3",
  "#D8DEE9",
  "#E5E9F0",
  "#ECEFF4",
  "#EFEDEC",
  "#F5F5F3",
  "#FFFFFF",
  "#EB144C",
  "#EF4444",
  "#BF616A",
  "#F78DA7",
  "#EC4899",
  "#FF6900",
  "#F97316",
  "#D08770",
  "#C9A66B",
  "#8B7355",
  "#FCB900",
  "#EAB308",
  "#EBCB8B",
  "#D9C7A3",
  "#D4C5A0",
  "#E5D5B7",
  "#84CC16",
  "#22C55E",
  "#A3BE8C",
  "#00D084",
  "#7BDCB5",
  "#14B8A6",
  "#8FBCBB",
  "#06B6D4",
  "#8ED1FC",
  "#0693E3",
  "#3B82F6",
  "#88C0D0",
  "#81A1C1",
  "#5E81AC",
  "#6366F1",
  "#8B5CF6",
  "#9900EF",
  "#A855F7",
  "#B48EAD",
];

const color = computed(() => model.value || "#000000");

// Naive reports lowercase hex; templates and presets use uppercase. The
// trigger fills with the colour and picks a contrasting label colour itself.
function onUpdate(value: string | null) {
  if (value) model.value = value.toUpperCase();
}
</script>

<template>
  <!-- Sized by a wrapper: Naive's own (unlayered) width rule beats Tailwind's layers -->
  <div class="w-32">
    <NColorPicker
      :value="color"
      :swatches="PRESET_COLORS"
      :modes="['hex']"
      :show-alpha="false"
      placement="left-start"
      size="small"
      @update:value="onUpdate"
    >
      <template #label="value">
        <span class="font-mono text-[12px] uppercase">{{ value }}</span>
      </template>
    </NColorPicker>
  </div>
</template>
