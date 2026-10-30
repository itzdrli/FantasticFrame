<script setup lang="ts">
import { computed, ref } from "vue";
import { NButton, NCheckbox, NIcon } from "naive-ui";
import { ChevronDown, ChevronUp, GripVertical } from "@lucide/vue";

/**
 * Visible EXIF fields as an ordered list: shown fields on top in caption
 * order (drag a row, or use its arrows on touch screens and keyboards), hidden
 * fields below. Ticking a hidden field appends it to the end.
 */
const props = defineProps<{ fields: { label: string; value: string }[] }>();
const model = defineModel<string[]>({ required: true });

const labelOf = (value: string) => props.fields.find((f) => f.value === value)?.label ?? value;

const shown = computed(() => model.value);
const hidden = computed(() => props.fields.filter((f) => !model.value.includes(f.value)));

function move(from: number, to: number) {
  if (to < 0 || to >= model.value.length || from === to) return;
  const next = [...model.value];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  model.value = next;
}

const remove = (value: string) => (model.value = model.value.filter((v) => v !== value));
const add = (value: string) => (model.value = [...model.value, value]);

// Live reordering: the dragged row swaps into place as it passes other rows,
// so the caption preview follows the drag.
const dragIndex = ref<number | null>(null);

function onDragStart(i: number, e: DragEvent) {
  dragIndex.value = i;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", shown.value[i] ?? "");
  }
}

function onDragOver(i: number, e: DragEvent) {
  if (dragIndex.value === null) return;
  e.preventDefault();
  if (dragIndex.value !== i) {
    move(dragIndex.value, i);
    dragIndex.value = i;
  }
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <ul
      v-if="shown.length"
      class="flex flex-col border border-nord-3"
      :aria-label="$t('typography.fieldOrder')"
    >
      <li
        v-for="(value, i) in shown"
        :key="value"
        draggable="true"
        class="group/row flex h-8 items-center gap-1.5 border-b border-nord-3 pr-1 last:border-b-0"
        :class="dragIndex === i ? 'bg-nord-8/15' : 'bg-nord-0 hover:bg-nord-2'"
        @dragstart="onDragStart(i, $event)"
        @dragover="onDragOver(i, $event)"
        @drop.prevent
        @dragend="dragIndex = null"
      >
        <span
          class="flex h-full cursor-grab items-center pl-1.5 text-nord-4/60 active:cursor-grabbing"
          :title="$t('typography.dragToReorder')"
        >
          <NIcon :size="14"><GripVertical /></NIcon>
        </span>
        <NCheckbox checked size="small" class="min-w-0 flex-1" @update:checked="remove(value)">
          {{ labelOf(value) }}
        </NCheckbox>
        <span class="flex opacity-60 group-hover/row:opacity-100 pointer-coarse:opacity-100">
          <NButton
            text
            size="tiny"
            :disabled="i === 0"
            :aria-label="$t('typography.moveUp')"
            @click="move(i, i - 1)"
          >
            <template #icon>
              <NIcon><ChevronUp /></NIcon>
            </template>
          </NButton>
          <NButton
            text
            size="tiny"
            :disabled="i === shown.length - 1"
            :aria-label="$t('typography.moveDown')"
            @click="move(i, i + 1)"
          >
            <template #icon>
              <NIcon><ChevronDown /></NIcon>
            </template>
          </NButton>
        </span>
      </li>
    </ul>

    <template v-if="hidden.length">
      <span class="mt-1 text-[12px] text-nord-4/60">{{ $t("typography.hiddenFields") }}</span>
      <div class="grid grid-cols-2 gap-x-2 gap-y-1.5">
        <NCheckbox
          v-for="f in hidden"
          :key="f.value"
          :checked="false"
          size="small"
          @update:checked="add(f.value)"
        >
          {{ f.label }}
        </NCheckbox>
      </div>
    </template>
  </div>
</template>
