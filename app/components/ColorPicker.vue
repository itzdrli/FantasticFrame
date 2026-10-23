<script setup lang="ts">
import { computed, ref, watch } from "vue";

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

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const color = computed(() => model.value || "#000000");

const hexDraft = ref(color.value);
watch(color, (c) => (hexDraft.value = c));

function commitHex() {
  const m = HEX_RE.exec(hexDraft.value.trim());
  if (!m) {
    hexDraft.value = color.value;
    return;
  }
  let hex = m[1]!;
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join("");
  model.value = `#${hex.toUpperCase()}`;
}
</script>

<template>
  <UPopover :content="{ side: 'left', align: 'start', sideOffset: 8 }">
    <button
      type="button"
      class="flex h-6 items-center gap-1.5 border border-default bg-muted pr-1.5 pl-0.5 outline-none hover:border-accented focus-visible:border-primary"
      :aria-label="color"
    >
      <span class="size-4 border border-black/30" :style="{ backgroundColor: color }" />
      <span class="font-mono text-[10px] text-muted uppercase">{{ color }}</span>
    </button>

    <template #content>
      <div class="flex w-56 flex-col gap-2 p-2.5">
        <UColorPicker
          :model-value="color"
          size="sm"
          class="w-full"
          @update:model-value="model = $event ?? color"
        />
        <UInput
          v-model="hexDraft"
          size="xs"
          variant="subtle"
          maxlength="7"
          :ui="{ base: 'font-mono uppercase' }"
          @blur="commitHex"
          @keydown.enter.prevent="commitHex"
        />
        <div class="grid grid-cols-8 gap-1">
          <button
            v-for="c in PRESET_COLORS"
            :key="c"
            type="button"
            class="aspect-square border outline-none focus-visible:ring-1 focus-visible:ring-primary"
            :class="c.toLowerCase() === color.toLowerCase() ? 'border-primary' : 'border-black/30'"
            :style="{ backgroundColor: c }"
            :aria-label="c"
            @click="model = c"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
