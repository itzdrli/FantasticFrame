<script setup lang="ts">
defineProps<{ isCover: boolean; cropScale: number; viewPercent: number }>();

const emit = defineEmits<{
  setFitMode: [mode: "contain" | "cover"];
  setZoom: [zoom: number];
  resetCrop: [];
  zoomView: [factor: number];
  resetView: [];
}>();

function onZoomInput(e: Event) {
  const n = Number((e.target as HTMLInputElement).value);
  if (Number.isFinite(n)) emit("setZoom", n / 100);
}
</script>

<template>
  <!-- Crop + view toolbar -->
  <div
    class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-nord-6 bg-nord-0/85 backdrop-blur border border-nord-2 rounded-lg px-2 py-1.5 shadow-lg cursor-default whitespace-nowrap"
    @pointerdown.stop
    @wheel.stop
    @dblclick.stop
  >
    <button
      class="px-2.5 py-1 rounded border transition-colors"
      :class="
        isCover
          ? 'bg-nord-8 text-nord-0 font-medium border-nord-8'
          : 'bg-nord-1 border-nord-3 hover:bg-nord-2'
      "
      :title="$t('preview.fillTitle')"
      @click="emit('setFitMode', 'cover')"
    >
      {{ $t("preview.fill") }}
    </button>
    <button
      class="px-2.5 py-1 rounded border transition-colors"
      :class="
        !isCover
          ? 'bg-nord-8 text-nord-0 font-medium border-nord-8'
          : 'bg-nord-1 border-nord-3 hover:bg-nord-2'
      "
      :title="$t('preview.fitTitle')"
      @click="emit('setFitMode', 'contain')"
    >
      {{ $t("preview.fit") }}
    </button>
    <template v-if="isCover">
      <span class="w-px h-4 bg-nord-3 mx-1" />
      <button
        class="w-6 h-6 flex items-center justify-center rounded border border-nord-3 bg-nord-1 hover:bg-nord-2 transition-colors"
        :title="$t('preview.zoomOut')"
        @click="emit('setZoom', cropScale - 0.25)"
      >
        -
      </button>
      <input
        type="number"
        min="100"
        max="500"
        step="1"
        :value="Math.round(cropScale * 100)"
        class="w-12 bg-nord-1 border border-nord-3 rounded px-1 py-0.5 text-xs text-nord-6 text-center tabular-nums focus:border-nord-8 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        aria-label="Zoom percent"
        @change="onZoomInput"
        @focus="($event.target as HTMLInputElement).select()"
      />
      <span class="text-[10px] text-nord-4">%</span>
      <button
        class="w-6 h-6 flex items-center justify-center rounded border border-nord-3 bg-nord-1 hover:bg-nord-2 transition-colors"
        :title="$t('preview.zoomIn')"
        @click="emit('setZoom', cropScale + 0.25)"
      >
        +
      </button>
      <button
        class="px-2.5 py-1 rounded border border-nord-3 bg-nord-1 hover:bg-nord-2 transition-colors"
        :title="$t('preview.resetCrop')"
        @click="emit('resetCrop')"
      >
        {{ $t("preview.reset") }}
      </button>
    </template>
    <span class="w-px h-4 bg-nord-3 mx-1" />
    <button
      class="w-6 h-6 flex items-center justify-center rounded border border-nord-3 bg-nord-1 hover:bg-nord-2 transition-colors"
      :title="$t('preview.viewZoomOut')"
      @click="emit('zoomView', 1 / 1.25)"
    >
      -
    </button>
    <span class="w-12 text-center tabular-nums" :title="$t('preview.viewHint')">
      {{ viewPercent }}%
    </span>
    <button
      class="w-6 h-6 flex items-center justify-center rounded border border-nord-3 bg-nord-1 hover:bg-nord-2 transition-colors"
      :title="$t('preview.viewZoomIn')"
      @click="emit('zoomView', 1.25)"
    >
      +
    </button>
    <button
      class="px-2.5 py-1 rounded border border-nord-3 bg-nord-1 hover:bg-nord-2 transition-colors"
      :title="$t('preview.fitViewTitle')"
      @click="emit('resetView')"
    >
      {{ $t("preview.fitView") }}
    </button>
  </div>
</template>
