<script setup lang="ts">
const props = defineProps<{ isCover: boolean; cropScale: number; viewPercent: number }>();

const emit = defineEmits<{
  setFitMode: [mode: "contain" | "cover"];
  setZoom: [zoom: number];
  resetCrop: [];
  zoomView: [factor: number];
  resetView: [];
}>();

function onZoomInput(n: number | null | undefined) {
  if (typeof n === "number" && Number.isFinite(n)) emit("setZoom", n / 100);
}
</script>

<template>
  <!-- Crop + view toolbar; swallows pointer events so it never pans the workspace -->
  <div
    class="absolute bottom-2 left-1/2 flex max-w-[calc(100%-1rem)] -translate-x-1/2 cursor-default items-center gap-1 overflow-x-auto border border-default bg-default/95 px-1.5 py-1 whitespace-nowrap backdrop-blur-sm md:bottom-3"
    @pointerdown.stop
    @wheel.stop
    @dblclick.stop
  >
    <UFieldGroup>
      <UTooltip :text="$t('preview.fillTitle')">
        <UButton
          :label="$t('preview.fill')"
          :color="props.isCover ? 'primary' : 'neutral'"
          :variant="props.isCover ? 'soft' : 'outline'"
          @click="emit('setFitMode', 'cover')"
        />
      </UTooltip>
      <UTooltip :text="$t('preview.fitTitle')">
        <UButton
          :label="$t('preview.fit')"
          :color="!props.isCover ? 'primary' : 'neutral'"
          :variant="!props.isCover ? 'soft' : 'outline'"
          @click="emit('setFitMode', 'contain')"
        />
      </UTooltip>
    </UFieldGroup>

    <template v-if="props.isCover">
      <USeparator orientation="vertical" class="mx-0.5 h-4" />
      <UButton
        icon="i-lucide-minus"
        color="neutral"
        variant="outline"
        :aria-label="$t('preview.zoomOut')"
        @click="emit('setZoom', props.cropScale - 0.25)"
      />
      <UInputNumber
        :model-value="Math.round(props.cropScale * 100)"
        :min="100"
        :max="500"
        :increment="false"
        :decrement="false"
        variant="subtle"
        class="w-14"
        :ui="{ base: 'text-center font-mono' }"
        aria-label="Zoom percent"
        @update:model-value="onZoomInput"
      />
      <span class="text-[10px] text-dimmed">%</span>
      <UButton
        icon="i-lucide-plus"
        color="neutral"
        variant="outline"
        :aria-label="$t('preview.zoomIn')"
        @click="emit('setZoom', props.cropScale + 0.25)"
      />
      <UTooltip :text="$t('preview.resetCrop')">
        <UButton
          :label="$t('preview.reset')"
          color="neutral"
          variant="ghost"
          @click="emit('resetCrop')"
        />
      </UTooltip>
    </template>

    <USeparator orientation="vertical" class="mx-0.5 hidden h-4 md:block" />
    <UButton
      icon="i-lucide-zoom-out"
      color="neutral"
      variant="outline"
      class="hidden md:inline-flex"
      :aria-label="$t('preview.viewZoomOut')"
      @click="emit('zoomView', 1 / 1.25)"
    />
    <UTooltip :text="$t('preview.viewHint')">
      <span class="hidden w-10 text-center font-mono text-[11px] text-muted md:inline">
        {{ props.viewPercent }}%
      </span>
    </UTooltip>
    <UButton
      icon="i-lucide-zoom-in"
      color="neutral"
      variant="outline"
      class="hidden md:inline-flex"
      :aria-label="$t('preview.viewZoomIn')"
      @click="emit('zoomView', 1.25)"
    />
    <UTooltip :text="$t('preview.fitViewTitle')">
      <UButton
        icon="i-lucide-scan"
        :label="$t('preview.fitView')"
        color="neutral"
        variant="ghost"
        @click="emit('resetView')"
      />
    </UTooltip>
  </div>
</template>
