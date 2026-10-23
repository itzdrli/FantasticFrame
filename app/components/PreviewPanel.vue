<script setup lang="ts">
import { computed, watch } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";

const photoStore = usePhotoStore();

const photo = computed(() => photoStore.selectedPhoto);

const { templateConfig, parsedExif, baseScaleFactor, canvasDims, footerLayout, photoLayout } =
  usePreviewLayout(photo);

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
  croppedImageStyle,
  setFitMode,
  setZoom,
  resetCrop,
  onPanStart,
  onPanMove,
  onPanEnd,
  onWheel,
} = usePhotoCrop(photo, photoLayout, previewScale);

// Scales a 1080px-based config value to PREVIEW canvas pixels
// (full canvas value = val * baseScaleFactor; preview = that * previewScale)
const configScale = computed(() => baseScaleFactor.value * previewScale.value);

const s = (v: number) => Math.round(v * configScale.value);

const imageRenderStyle = computed(() => {
  if (!photo.value || !templateConfig.value) return {};
  const cfg = templateConfig.value;
  const layout = photoLayout.value;
  if (!layout) return {};
  const ps = previewScale.value;

  return {
    width: `${Math.round(layout.imgW * ps)}px`,
    height: `${Math.round(layout.imgH * ps)}px`,
    borderRadius: `${s(cfg.borderRadius)}px`,
    objectFit: "contain" as const,
    display: "block" as const,
    boxSizing: "border-box" as const,
  };
});

// Cover mode: clipping frame + absolutely positioned (zoomed/panned) image
const photoFrameStyle = computed(() => {
  if (!photo.value || !templateConfig.value) return {};
  const cfg = templateConfig.value;
  const layout = photoLayout.value;
  if (!layout) return {};
  const ps = previewScale.value;

  return {
    width: `${Math.round(layout.availW * ps)}px`,
    height: `${Math.round(layout.availH * ps)}px`,
    position: "relative" as const,
    overflow: "hidden" as const,
    borderRadius: `${s(cfg.borderRadius)}px`,
    boxSizing: "border-box" as const,
    touchAction: "none" as const,
  };
});

const displayExifEntries = computed(() => {
  if (!templateConfig.value || !parsedExif.value) return [];
  return (templateConfig.value.visibleFields ?? [])
    .map((f) => ({ key: f, value: parsedExif.value[f] }))
    .filter((e) => e.value);
});

const hasExif = computed(() => displayExifEntries.value.length > 0);

const resolvedLogoImage = computed(() => {
  if (!templateConfig.value) return "";
  return templateConfig.value.logoImageUrl || "";
});

const resolvedLogoText = computed(() => {
  if (!templateConfig.value || !photo.value) return "";
  return templateConfig.value.logoText || (photo.value.exif.make || "").toUpperCase();
});

const hasLogo = computed(
  () =>
    templateConfig.value?.showLogo !== false &&
    (!!resolvedLogoImage.value || !!resolvedLogoText.value),
);

const logoStyle = computed(() => {
  if (!templateConfig.value) return {};
  return {
    fontSize: `${s(templateConfig.value.modelFontSize)}px`,
    fontWeight: "bold",
    color: templateConfig.value.fontColor,
    fontFamily: templateConfig.value.fontFamily,
  };
});

const exifItemStyle = computed(() => {
  if (!templateConfig.value) return {};
  return {
    fontSize: `${s(templateConfig.value.fontSize)}px`,
    color: templateConfig.value.fontColor,
    fontFamily: templateConfig.value.fontFamily,
  };
});

const exifContainerStyle = computed(() => {
  const layout = templateConfig.value?.infoLayout || "horizontal";
  if (layout === "list") {
    return {
      display: "flex",
      flexDirection: "column" as const,
      gap: `${s(4)}px`,
    };
  }
  if (layout === "grid") {
    return {
      display: "grid",
      gridTemplateColumns: "repeat(2, auto)",
      gap: `${s(4)}px ${s(14)}px`,
    };
  }
  // horizontal
  return {
    display: "flex",
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: `${s(2)}px ${s(14)}px`,
  };
});

// Logo <img> display size — comes straight from the shared footer layout
// (the same function buildRenderTree uses), scaled to preview pixels.
const logoImgWidth = computed(() =>
  Math.round((footerLayout.value?.logoImageW ?? 0) * previewScale.value),
);

const logoImgHeight = computed(() =>
  Math.round((footerLayout.value?.logoImageH ?? 0) * previewScale.value),
);

const canvasStyle = computed(() => {
  if (!templateConfig.value) return {};
  const cfg = templateConfig.value;
  return {
    width: `${previewDims.value.w}px`,
    height: `${previewDims.value.h}px`,
    background: cfg.backgroundColor || "#fff",
    fontFamily: cfg.fontFamily,
    color: cfg.fontColor,
    position: "relative" as const,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden" as const,
  };
});

const footerStyle = computed(() => {
  if (!templateConfig.value) return {};
  const cfg = templateConfig.value;
  const horizPad = Math.max(s(20), s(cfg.paddingHorizontal));
  return {
    width: "100%",
    paddingLeft: `${horizPad}px`,
    paddingRight: `${horizPad}px`,
    paddingTop: `${s(20)}px`,
    paddingBottom: `${s(20)}px`,
    boxSizing: "border-box" as const,
    display: "flex",
    flexDirection: cfg.logoPosition === "center" ? ("column" as const) : ("row" as const),
    alignItems: "center",
    justifyContent: cfg.logoPosition === "center" ? "center" : "space-between",
    gap: `${s(16)}px`,
    flexShrink: 0,
  };
});
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
      class="flex h-full w-full items-center justify-center text-muted"
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
          class="size-16 text-dimmed"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
        <p class="text-xl font-semibold">{{ $t("preview.emptyTitle") }}</p>
      </div>
    </div>

    <template v-else>
      <!-- Canvas Wrapper (positioned by workspace pan/zoom) -->
      <div :style="canvasPositionStyle">
        <div :style="canvasStyle" class="shadow-[0_4px_28px_rgba(0,0,0,0.5)]">
          <div
            class="flex-1 w-full flex items-center justify-center"
            :style="{
              paddingTop: `${s(templateConfig.paddingTop)}px`,
              paddingBottom: `${s(templateConfig.paddingBottom)}px`,
              paddingLeft: `${s(templateConfig.paddingHorizontal)}px`,
              paddingRight: `${s(templateConfig.paddingHorizontal)}px`,
            }"
          >
            <div
              v-if="isCover"
              :style="photoFrameStyle"
              class="select-none"
              :class="dragging ? 'cursor-grabbing' : canPan ? 'cursor-grab' : 'cursor-default'"
              @pointerdown="onPanStart"
              @pointermove="onPanMove"
              @pointerup="onPanEnd"
              @pointercancel="onPanEnd"
              @wheel="onWheel"
            >
              <img :src="photo.url" :style="croppedImageStyle" draggable="false" alt="" />
            </div>
            <img v-else :src="photo.url" :style="imageRenderStyle" />
          </div>

          <!-- Footer -->
          <div v-if="hasLogo || hasExif" :style="footerStyle">
            <!-- Right position: EXIF first, logo pushed to the right edge -->
            <template v-if="templateConfig.logoPosition === 'right'">
              <div v-if="!hasLogo" class="flex-1" />
              <div v-if="hasExif" :style="exifContainerStyle">
                <span v-for="entry in displayExifEntries" :key="entry.key" :style="exifItemStyle">
                  {{ entry.value }}
                </span>
              </div>
              <div v-if="hasLogo && hasExif" class="flex-1" />
              <template v-if="hasLogo">
                <img
                  v-if="resolvedLogoImage"
                  :src="resolvedLogoImage"
                  :style="{
                    width: `${logoImgWidth}px`,
                    height: `${logoImgHeight}px`,
                    objectFit: 'contain',
                  }"
                />
                <span v-else :style="logoStyle">{{ resolvedLogoText }}</span>
              </template>
            </template>

            <!-- Left / center positions -->
            <template v-else>
              <template v-if="hasLogo">
                <img
                  v-if="resolvedLogoImage"
                  :src="resolvedLogoImage"
                  :style="{
                    width: `${logoImgWidth}px`,
                    height: `${logoImgHeight}px`,
                    objectFit: 'contain',
                  }"
                />
                <span v-else :style="logoStyle">{{ resolvedLogoText }}</span>
              </template>

              <!-- Spacer for left/right layouts -->
              <div
                v-if="templateConfig.logoPosition !== 'center' && hasLogo && hasExif"
                class="flex-1"
              />

              <!-- EXIF entries with dynamic layout -->
              <div v-if="hasExif" :style="exifContainerStyle">
                <span v-for="entry in displayExifEntries" :key="entry.key" :style="exifItemStyle">
                  {{ entry.value }}
                </span>
              </div>
            </template>
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
