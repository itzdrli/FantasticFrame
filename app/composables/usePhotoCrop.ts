import { computed, ref, type ComputedRef } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { clamp } from "~/utils/math";
import { coverCropRect } from "~~/shared/render";
import type { Photo, PhotoCrop } from "~/types";

/**
 * Cover-crop state of the selected photo (zoom, fit mode, offsets) and the
 * drag/wheel interactions that edit it. Pixel math runs in preview pixels, so
 * `previewScale` must be the same scale the canvas is drawn at.
 */
export const usePhotoCrop = (
  photo: ComputedRef<Photo | null>,
  photoLayout: ComputedRef<{ availW: number; availH: number } | null>,
  previewScale: ComputedRef<number>,
) => {
  const photoStore = usePhotoStore();

  const isCover = computed(() => photo.value?.crop?.fitMode === "cover");
  const cropScale = computed(() => photo.value?.crop?.scale ?? 1);
  const cropOffsetX = computed(() => photo.value?.crop?.offsetX ?? 0);
  const cropOffsetY = computed(() => photo.value?.crop?.offsetY ?? 0);

  function updateCrop(patch: Partial<PhotoCrop>) {
    if (!photo.value) return;
    photoStore.setPhotoCrop(photo.value.id, {
      fitMode: "cover",
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      ...photo.value.crop,
      ...patch,
    });
  }

  function setFitMode(mode: "contain" | "cover") {
    updateCrop({ fitMode: mode });
  }

  function setZoom(zoom: number) {
    updateCrop({ scale: clamp(zoom, 1, 5) });
  }

  function onZoomInput(e: Event) {
    const n = Number((e.target as HTMLInputElement).value);
    if (!Number.isFinite(n)) return;
    setZoom(n / 100);
  }

  function resetCrop() {
    updateCrop({ scale: 1, offsetX: 0, offsetY: 0 });
  }

  const croppedImageStyle = computed(() => {
    const layout = photoLayout.value;
    if (!layout || !photo.value) return {};
    const ps = previewScale.value;
    const boxW = Math.round(layout.availW * ps);
    const boxH = Math.round(layout.availH * ps);
    const { left, top, width, height } = coverCropRect(
      boxW,
      boxH,
      photo.value.width / photo.value.height,
      cropScale.value,
      cropOffsetX.value,
      cropOffsetY.value,
    );
    return {
      position: "absolute" as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${Math.round(width)}px`,
      height: `${Math.round(height)}px`,
      display: "block" as const,
      maxWidth: "none" as const,
      userSelect: "none" as const,
      pointerEvents: "none" as const,
    };
  });

  const dragging = ref(false);
  const dragStart = ref({ x: 0, y: 0, ox: 0, oy: 0 });

  /** Overflow halves (px) on each axis at the current zoom; 0 = axis is flush */
  const panRanges = () => {
    const layout = photoLayout.value;
    const p = photo.value;
    if (!layout || !p) return { spanX: 0, spanY: 0 };
    const ps = previewScale.value;
    const boxW = Math.round(layout.availW * ps);
    const boxH = Math.round(layout.availH * ps);
    const rect = coverCropRect(boxW, boxH, p.width / p.height, cropScale.value, 0, 0);
    return { spanX: (rect.width - boxW) / 2, spanY: (rect.height - boxH) / 2 };
  };

  const canPan = computed(() => {
    const { spanX, spanY } = panRanges();
    return spanX > 0.5 || spanY > 0.5;
  });

  function onPanStart(e: PointerEvent) {
    // Non-primary buttons (middle-drag) fall through to the workspace pan
    if (!isCover.value || e.button !== 0) return;
    const { spanX, spanY } = panRanges();
    if (spanX <= 0.5 && spanY <= 0.5) return;
    e.stopPropagation();
    dragging.value = true;
    dragStart.value = {
      x: e.clientX,
      y: e.clientY,
      ox: cropOffsetX.value,
      oy: cropOffsetY.value,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPanMove(e: PointerEvent) {
    if (!dragging.value || !photo.value) return;
    const { spanX, spanY } = panRanges();
    const patch: Partial<PhotoCrop> = {};
    if (spanX > 0.5) {
      // Inverted so the photo follows the cursor (grab-the-paper feel): a drag
      // right shows more of the photo's right side, which needs offsetX to go
      // DOWN (offsetX 1 = right edge = content pushed left).
      patch.offsetX = clamp(dragStart.value.ox - (e.clientX - dragStart.value.x) / spanX, -1, 1);
    } else {
      patch.offsetX = 0;
    }
    if (spanY > 0.5) {
      patch.offsetY = clamp(dragStart.value.oy - (e.clientY - dragStart.value.y) / spanY, -1, 1);
    } else {
      patch.offsetY = 0;
    }
    updateCrop(patch);
  }

  function onPanEnd() {
    dragging.value = false;
  }

  function onWheel(e: WheelEvent) {
    // Ctrl/Cmd+wheel (and trackpad pinch, which arrives as ctrl+wheel) always
    // zooms the workspace, even over the photo.
    if (!isCover.value || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    e.stopPropagation();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setZoom(cropScale.value * factor);
  }

  return {
    isCover,
    cropScale,
    dragging,
    canPan,
    croppedImageStyle,
    setFitMode,
    setZoom,
    onZoomInput,
    resetCrop,
    onPanStart,
    onPanMove,
    onPanEnd,
    onWheel,
  };
};
