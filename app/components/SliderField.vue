<script setup lang="ts">
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    label: string;
    min: number;
    max: number;
    step?: number;
    suffix?: string;
  }>(),
  { step: 1, suffix: "" },
);

const model = defineModel<number>({ required: true });

const focused = ref(false);
const draft = ref("");

const shown = computed(() => (focused.value ? draft.value : String(model.value)));

function clamp(n: number) {
  const step = props.step ?? 1;
  const stepped = Math.round(n / step) * step;
  return Math.min(props.max, Math.max(props.min, stepped));
}

function onFocus(e: FocusEvent) {
  focused.value = true;
  draft.value = String(model.value);
  (e.target as HTMLInputElement).select();
}

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value;
  draft.value = raw;
  if (raw === "" || raw === "-" || raw === ".") return;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= props.min && n <= props.max) model.value = clamp(n);
}

function commit() {
  focused.value = false;
  const n = Number(draft.value);
  if (!Number.isFinite(n)) return;
  model.value = clamp(n);
}

function onWheel(e: WheelEvent) {
  const step = (props.step ?? 1) * (e.shiftKey ? 10 : 1);
  model.value = clamp(model.value + (e.deltaY < 0 ? step : -step));
  if (focused.value) draft.value = String(model.value);
}
</script>

<template>
  <div class="flex flex-col gap-1" @wheel.prevent="onWheel">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs text-nord-4">{{ label }}</span>
      <div class="flex items-center gap-1">
        <input
          type="number"
          :min="min"
          :max="max"
          :step="step"
          :value="shown"
          :aria-label="label"
          class="w-14 bg-nord-2 border border-nord-3 rounded-md px-1.5 py-0.5 text-nord-6 text-xs text-right tabular-nums focus:border-nord-8 focus:outline-none transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          @focus="onFocus"
          @input="onInput"
          @blur="commit"
          @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
        />
        <span v-if="suffix" class="text-[10px] text-nord-4 min-w-4 shrink-0">{{ suffix }}</span>
      </div>
    </div>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :aria-label="label"
      v-model.number="model"
      class="w-full accent-nord-8 h-4 cursor-pointer"
    />
  </div>
</template>
