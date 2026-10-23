<script setup lang="ts">
import { computed } from "vue";
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
  <div class="group/param flex flex-col py-0.5">
    <div class="flex h-5 items-center justify-between gap-2">
      <span
        class="min-w-0 flex-1 cursor-ew-resize touch-none truncate select-none text-[11px] transition-colors"
        :class="changed ? 'text-highlighted' : 'text-muted'"
        @pointerdown="onScrubStart"
        @pointermove="onScrubMove"
        @pointerup="onScrubEnd"
        @pointercancel="onScrubEnd"
        @dblclick="reset"
      >
        {{ label }}
      </span>
      <UButton
        v-if="changed"
        icon="i-lucide-rotate-ccw"
        color="neutral"
        variant="link"
        size="xs"
        :aria-label="$t('panel.resetValue')"
        class="p-0.5 opacity-0 transition-opacity group-hover/param:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
        @click="reset"
      />
      <div class="flex items-center">
        <UInputNumber
          :model-value="model"
          :min="min"
          :max="max"
          :step="step"
          :increment="false"
          :decrement="false"
          variant="none"
          size="xs"
          :aria-label="label"
          class="w-12"
          :ui="{ base: 'px-1 py-0.5 text-right font-mono text-[11px] text-highlighted' }"
          @update:model-value="onInput"
        />
        <span v-if="suffix" class="w-4 text-[10px] text-dimmed">{{ suffix }}</span>
      </div>
    </div>
    <USlider
      :model-value="model"
      :min="min"
      :max="max"
      :step="step"
      size="xs"
      :aria-label="label"
      :ui="{
        root: 'h-3',
        track: 'h-[2px] rounded-none bg-accented',
        range: changed ? 'rounded-none bg-primary' : 'rounded-none bg-nord-4/60',
        thumb: 'h-3 w-[3px] rounded-none bg-inverted ring-0 outline-offset-1 hover:bg-primary',
      }"
      @update:model-value="(v) => onInput(v as number)"
      @dblclick="reset"
    />
  </div>
</template>
