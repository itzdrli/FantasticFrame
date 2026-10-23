<script setup lang="ts">
import { NButton, NButtonGroup, NDivider, NIcon, NInputNumber, NTooltip } from "naive-ui";
import { Minus, Plus, Scan, ZoomIn, ZoomOut } from "@lucide/vue";

const props = defineProps<{ isCover: boolean; cropScale: number; viewPercent: number }>();

const emit = defineEmits<{
  setFitMode: [mode: "contain" | "cover"];
  setZoom: [zoom: number];
  resetCrop: [];
  zoomView: [factor: number];
  resetView: [];
}>();

const zoomInputProps = { style: { textAlign: "center", fontFamily: "var(--font-mono)" } } as const;

function onZoomInput(n: number | null) {
  if (typeof n === "number" && Number.isFinite(n)) emit("setZoom", n / 100);
}
</script>

<template>
  <!-- Crop + view toolbar; swallows pointer events so it never pans the workspace -->
  <div
    class="absolute bottom-2 left-1/2 flex max-w-[calc(100%-1rem)] -translate-x-1/2 cursor-default items-center gap-1 overflow-x-auto border border-nord-3 bg-nord-1/95 px-1.5 py-1 whitespace-nowrap backdrop-blur-sm md:bottom-3"
    @pointerdown.stop
    @wheel.stop
    @dblclick.stop
  >
    <NButtonGroup size="tiny">
      <NTooltip :delay="500">
        <template #trigger>
          <NButton
            :type="props.isCover ? 'primary' : 'default'"
            :secondary="props.isCover"
            @click="emit('setFitMode', 'cover')"
          >
            {{ $t("preview.fill") }}
          </NButton>
        </template>
        {{ $t("preview.fillTitle") }}
      </NTooltip>
      <NTooltip :delay="500">
        <template #trigger>
          <NButton
            :type="!props.isCover ? 'primary' : 'default'"
            :secondary="!props.isCover"
            @click="emit('setFitMode', 'contain')"
          >
            {{ $t("preview.fit") }}
          </NButton>
        </template>
        {{ $t("preview.fitTitle") }}
      </NTooltip>
    </NButtonGroup>

    <template v-if="props.isCover">
      <NDivider vertical />
      <NButton
        size="tiny"
        :aria-label="$t('preview.zoomOut')"
        @click="emit('setZoom', props.cropScale - 0.25)"
      >
        <template #icon>
          <NIcon><Minus /></NIcon>
        </template>
      </NButton>
      <NInputNumber
        :value="Math.round(props.cropScale * 100)"
        :min="100"
        :max="500"
        :show-button="false"
        size="tiny"
        :input-props="zoomInputProps"
        class="w-14"
        aria-label="Zoom percent"
        @update:value="onZoomInput"
      />
      <span class="text-[12px] text-nord-4/60">%</span>
      <NButton
        size="tiny"
        :aria-label="$t('preview.zoomIn')"
        @click="emit('setZoom', props.cropScale + 0.25)"
      >
        <template #icon>
          <NIcon><Plus /></NIcon>
        </template>
      </NButton>
      <NTooltip :delay="500">
        <template #trigger>
          <NButton size="tiny" quaternary @click="emit('resetCrop')">
            {{ $t("preview.reset") }}
          </NButton>
        </template>
        {{ $t("preview.resetCrop") }}
      </NTooltip>
    </template>

    <!-- Workspace zoom: desktop only (phones pinch). Wrapped because Naive's
         unlayered display rule would beat a `hidden` utility on the button. -->
    <div class="hidden items-center gap-1 md:flex">
      <NDivider vertical />
      <NButton
        size="tiny"
        :aria-label="$t('preview.viewZoomOut')"
        @click="emit('zoomView', 1 / 1.25)"
      >
        <template #icon>
          <NIcon><ZoomOut /></NIcon>
        </template>
      </NButton>
      <NTooltip :delay="500">
        <template #trigger>
          <span class="w-10 text-center font-mono text-[13px] text-nord-4">
            {{ props.viewPercent }}%
          </span>
        </template>
        {{ $t("preview.viewHint") }}
      </NTooltip>
      <NButton size="tiny" :aria-label="$t('preview.viewZoomIn')" @click="emit('zoomView', 1.25)">
        <template #icon>
          <NIcon><ZoomIn /></NIcon>
        </template>
      </NButton>
    </div>
    <NTooltip :delay="500">
      <template #trigger>
        <NButton size="tiny" quaternary @click="emit('resetView')">
          <template #icon>
            <NIcon><Scan /></NIcon>
          </template>
          {{ $t("preview.fitView") }}
        </NButton>
      </template>
      {{ $t("preview.fitViewTitle") }}
    </NTooltip>
  </div>
</template>
