<script setup lang="ts">
import { computed, watch } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { buildRenderTree } from "~~/shared/render";

const photoStore = usePhotoStore();

const photo = computed(() => photoStore.selectedPhoto);

const { templateConfig, canvasDims, photoLayout } = usePreviewLayout(photo);

const {
  viewportRef,
  viewDragging,
  previewScale,
  previewDims,
  viewPercent,
  canvasPositionStyle,
  resetView,
  zoomViewBy,
  onViewWheel,
  onViewPointerCapture,
  onViewPanStart,
  onViewPanMove,
  onViewPanEnd,
} = usePreviewViewport(
  computed(() => !!photo.value),
  canvasDims,
);

watch(() => photo.value?.id, resetView);

const {
  isCover,
  cropScale,
  dragging,
  canPan,
  setFitMode,
  setZoom,
  resetCrop,
  onPanStart,
  onPanMove,
  onPanEnd,
  onWheel,
} = usePhotoCrop(photo, photoLayout, previewScale);

// The tree is built at on-screen size (never above full resolution); zooming
// the view past 100% scales the finished tree with CSS instead.
const treeScale = computed(() => Math.min(previewScale.value, 1));

const preview = computed(() => {
  const p = photo.value;
  const cfg = templateConfig.value;
  if (!p || !cfg || treeScale.value <= 0) return null;
  return buildRenderTree(
    {
      photoBase64: p.url,
      exifData: p.exif,
      templateConfig: cfg,
      photoWidth: p.width,
      photoHeight: p.height,
      crop: p.crop,
    },
    { scale: treeScale.value },
  );
});

const canvasStyle = computed(() => ({
  width: `${previewDims.value.w}px`,
  height: `${previewDims.value.h}px`,
}));

const treeStyle = computed(() => {
  const k = previewScale.value / treeScale.value;
  return k > 1.0001 ? { transform: `scale(${k})`, transformOrigin: "0 0" } : {};
});

// Cover crop: the photo frame takes the drag/wheel gestures
const frameAttrs = computed(() =>
  isCover.value
    ? {
        class: dragging.value ? "cursor-grabbing" : canPan.value ? "cursor-grab" : "cursor-default",
        onPointerdown: onPanStart,
        onPointermove: onPanMove,
        onPointerup: onPanEnd,
        onPointercancel: onPanEnd,
        onWheel,
      }
    : undefined,
);
</script>

<template>
  <div
    ref="viewportRef"
    class="relative h-full w-full overflow-hidden select-none touch-none"
    :class="photo && templateConfig ? (viewDragging ? 'cursor-grabbing' : 'cursor-grab') : ''"
    @wheel="onViewWheel"
    @pointerdown.capture="onViewPointerCapture"
    @pointermove.capture="onViewPointerCapture"
    @pointerup.capture="onViewPointerCapture"
    @pointercancel.capture="onViewPointerCapture"
    @pointerdown="onViewPanStart"
    @pointermove="onViewPanMove"
    @pointerup="onViewPanEnd"
    @pointercancel="onViewPanEnd"
    @dblclick.self="resetView"
  >
    <!-- Empty State -->
    <div
      v-if="!photo || !templateConfig"
      class="flex h-full w-full items-center justify-center text-nord-4"
    >
      <div class="flex flex-col items-center justify-center p-8 text-center gap-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-16 text-nord-4/60"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
        <p class="text-xl font-bold">{{ $t("preview.emptyTitle") }}</p>
      </div>
    </div>

    <template v-else>
      <!-- Canvas Wrapper (positioned by workspace pan/zoom) -->
      <div :style="canvasPositionStyle">
        <div :style="canvasStyle" class="shadow-[0_4px_28px_rgba(0,0,0,0.5)]">
          <div v-if="preview" :style="treeStyle">
            <RenderNodeView
              :node="preview.nodeTree"
              :frame="preview.photoFrame"
              :frame-attrs="frameAttrs"
            />
          </div>
        </div>
      </div>

      <PreviewToolbar
        :is-cover="isCover"
        :crop-scale="cropScale"
        :view-percent="viewPercent"
        @set-fit-mode="setFitMode"
        @set-zoom="setZoom"
        @reset-crop="resetCrop"
        @zoom-view="zoomViewBy"
        @reset-view="resetView"
      />
    </template>
  </div>
</template>
