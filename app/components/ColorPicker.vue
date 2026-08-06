<script setup lang="ts">
import { TwitterPicker } from "vue-color";

const model = defineModel<string>({ default: "#000000" });

const open = ref(false);
const root = ref<HTMLElement | null>(null);

// Expanded preset palette, ordered by lightness then hue (dark → light
// neutrals first, then a red → orange → yellow → green → teal → blue →
// purple rainbow) so the swatch grid reads top-to-bottom as one progression.
const PRESET_COLORS = [
  // Neutrals, dark → light
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
  // Reds & pinks
  "#EB144C",
  "#EF4444",
  "#BF616A",
  "#F78DA7",
  "#EC4899",
  // Oranges & browns
  "#FF6900",
  "#F97316",
  "#D08770",
  "#C9A66B",
  "#8B7355",
  // Yellows & creams
  "#FCB900",
  "#EAB308",
  "#EBCB8B",
  "#D9C7A3",
  "#D4C5A0",
  "#E5D5B7",
  // Greens & mint
  "#84CC16",
  "#22C55E",
  "#A3BE8C",
  "#00D084",
  "#7BDCB5",
  // Teals & cyans
  "#14B8A6",
  "#8FBCBB",
  "#06B6D4",
  "#8ED1FC",
  // Blues
  "#0693E3",
  "#3B82F6",
  "#88C0D0",
  "#81A1C1",
  "#5E81AC",
  // Purples
  "#6366F1",
  "#8B5CF6",
  "#9900EF",
  "#A855F7",
  "#B48EAD",
];

function onDocPointerDown(e: PointerEvent) {
  if (!open.value || !root.value) return;
  if (!root.value.contains(e.target as Node)) open.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") open.value = false;
}

onMounted(() => {
  document.addEventListener("pointerdown", onDocPointerDown, true);
  document.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocPointerDown, true);
  document.removeEventListener("keydown", onKeydown);
});

const displayColor = computed(() => model.value || "#000000");

function onPick(val: string | { hex?: string } | unknown) {
  // vue-color preserves the input format; with a hex string model it emits hex.
  if (typeof val === "string") {
    model.value = val;
    return;
  }
  if (val && typeof val === "object" && "hex" in val && typeof (val as any).hex === "string") {
    model.value = (val as { hex: string }).hex;
  }
}
</script>

<template>
  <div ref="root" class="relative inline-flex">
    <button
      type="button"
      @click="open = !open"
      class="w-8 h-8 rounded cursor-pointer border border-nord-3 bg-nord-1 p-0.5 shrink-0"
      :title="displayColor"
      :aria-expanded="open"
      aria-haspopup="dialog"
    >
      <span
        class="block w-full h-full rounded-sm border border-nord-3/40"
        :style="{ backgroundColor: displayColor }"
      />
    </button>

    <div
      v-if="open"
      class="ff-color-picker absolute z-50 top-full right-0 mt-2"
      role="dialog"
      aria-label="Color picker"
    >
      <TwitterPicker
        :model-value="displayColor"
        :preset-colors="PRESET_COLORS"
        triangle="hide"
        :width="280"
        @update:model-value="onPick"
      />
    </div>
  </div>
</template>

<style scoped>
.ff-color-picker {
  --vc-body-bg: #3b4252;
  --vc-picker-bg: #3b4252;
  --vc-twitter-input-bg: #2e3440;
  --vc-twitter-input-border: #4c566a;
  --vc-twitter-input-color: #eceff4;
  --vc-twitter-hash-bg: #434c5e;
  --vc-twitter-hash-color: #d8dee9;
  --vc-input-bg: #2e3440;
  --vc-input-text: #eceff4;
  --vc-input-border: #4c566a;
}

.ff-color-picker :deep(.vc-twitter-picker) {
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.45),
    0 0 0 1px #4c566a;
}

/* Give every swatch a visible edge — light colors (white, cream, #ECEFF4…)
   would otherwise blend into the picker background. The selected color keeps
   its glow via the inline box-shadow from the component; the border sits
   underneath it. */
.ff-color-picker :deep(.swatch) {
  border: 1px solid rgba(216, 222, 233, 0.35);
  box-sizing: border-box;
}
</style>
