<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon, NInputNumber, NSlider, useThemeVars } from "naive-ui";
import { RotateCcw } from "@lucide/vue";
import { clamp } from "~/utils/math";

const props = withDefaults(
  defineProps<{
    label: string;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
    /** The template's own value: double-click resets to it and a change is highlighted */
    defaultValue?: number;
  }>(),
  { step: 1, suffix: "" },
);

const model = defineModel<number>({ required: true });

const changed = computed(
  () => props.defaultValue !== undefined && model.value !== props.defaultValue,
);

const snap = (n: number) => clamp(Math.round(n / props.step) * props.step, props.min, props.max);

// A changed value is drawn in the accent colour, like the label
const themeVars = useThemeVars();
const sliderOverrides = computed(() =>
  changed.value
    ? { fillColor: themeVars.value.primaryColor, fillColorHover: themeVars.value.primaryColor }
    : undefined,
);

// The value reads as plain text until focused, like Lightroom's numeric fields
const valueOverrides = {
  peers: { Input: { color: "transparent", colorFocus: "transparent", paddingTiny: "0 2px" } },
};
const valueInputProps = {
  style: { textAlign: "right", fontFamily: "var(--font-mono)" },
} as const;

function reset() {
  if (props.defaultValue !== undefined) model.value = props.defaultValue;
}

function onInput(v: number | null | undefined) {
  if (typeof v === "number" && Number.isFinite(v)) model.value = snap(v);
}

// Scrubbing: drag the label sideways to change the value, like the labels in
// Lightroom/Photoshop. The full range is ~300px of travel; Shift makes it 10x finer.
const SCRUB_TRAVEL = 300;
let scrub: { x: number; value: number } | null = null;

function onScrubStart(e: PointerEvent) {
  if (e.button !== 0) return;
  scrub = { x: e.clientX, value: model.value };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}

function onScrubMove(e: PointerEvent) {
  if (!scrub) return;
  const perPx = ((props.max - props.min) / SCRUB_TRAVEL) * (e.shiftKey ? 0.1 : 1);
  model.value = snap(scrub.value + (e.clientX - scrub.x) * perPx);
}

function onScrubEnd() {
  scrub = null;
}
</script>

<template>
  <div class="group/param flex flex-col py-1">
    <div class="flex h-7 items-center justify-between gap-2">
      <span
        class="min-w-0 flex-1 cursor-ew-resize touch-none truncate select-none text-[13px] transition-colors"
        :class="changed ? 'text-nord-6' : 'text-nord-4'"
        @pointerdown="onScrubStart"
        @pointermove="onScrubMove"
        @pointerup="onScrubEnd"
        @pointercancel="onScrubEnd"
        @dblclick="reset"
      >
        {{ label }}
      </span>
      <span
        v-if="changed"
        class="flex opacity-0 transition-opacity group-hover/param:opacity-100 focus-within:opacity-100 max-md:opacity-100"
      >
        <NButton text size="tiny" :aria-label="$t('panel.resetValue')" @click="reset">
          <template #icon>
            <NIcon><RotateCcw /></NIcon>
          </template>
        </NButton>
      </span>
      <div class="flex items-center">
        <NInputNumber
          :value="model"
          :min="min"
          :max="max"
          :step="step"
          :show-button="false"
          :bordered="false"
          size="tiny"
          :input-props="valueInputProps"
          :theme-overrides="valueOverrides"
          :aria-label="label"
          class="w-16"
          @update:value="onInput"
        />
        <span v-if="suffix" class="w-5 text-[12px] text-nord-4/60">{{ suffix }}</span>
      </div>
    </div>
    <div @dblclick="reset">
      <NSlider
        :value="model"
        :min="min"
        :max="max"
        :step="step"
        :tooltip="false"
        :theme-overrides="sliderOverrides"
        :aria-label="label"
        @update:value="onInput"
      >
        <template #thumb>
          <div class="h-4 w-1 bg-nord-6 transition-colors hover:bg-nord-8" />
        </template>
      </NSlider>
    </div>
  </div>
</template>
