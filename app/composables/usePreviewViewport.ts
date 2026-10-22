import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef } from "vue";
import { clamp } from "~/utils/math";

/**
 * Workspace viewport: fits the canvas to the measured viewport and layers a
 * free zoom/pan of the whole canvas on top. `hasPhoto` gates the interactions.
 */
export const usePreviewViewport = (
  hasPhoto: ComputedRef<boolean>,
  canvasDims: ComputedRef<{ w: number; h: number }>,
) => {
  // Workspace viewport: the canvas is fitted to the measured viewport size (so a
  // huge photo can never overflow it), then the user can freely zoom/pan the
  // whole canvas on top of that fit. Margins keep the fitted canvas off the
  // edges and clear of the floating toolbar at the bottom.
  const FIT_MARGIN = 32;
  const TOOLBAR_SPACE = 56;
  const VIEW_ZOOM_MIN = 0.1;
  const VIEW_ZOOM_MAX = 20;

  const viewportRef = ref<HTMLElement | null>(null);
  const viewportSize = ref({ w: 0, h: 0 });
  let resizeObserver: ResizeObserver | null = null;

  onMounted(() => {
    const el = viewportRef.value;
    if (!el) return;
    const measure = () => {
      viewportSize.value = { w: el.clientWidth, h: el.clientHeight };
    };
    measure();
    resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);
  });

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  });

  // Relative to the fit scale, so a window resize keeps the same framing
  const viewZoom = ref(1);
  const viewPan = ref({ x: 0, y: 0 });

  function resetView() {
    viewZoom.value = 1;
    viewPan.value = { x: 0, y: 0 };
  }

  const fitScale = computed(() => {
    const { w, h } = canvasDims.value;
    if (!w || !h) return 1;
    const vw = viewportSize.value.w || 1100;
    const vh = viewportSize.value.h || 760;
    const availW = Math.max(50, vw - FIT_MARGIN * 2);
    const availH = Math.max(50, vh - FIT_MARGIN * 2 - TOOLBAR_SPACE);
    return Math.min(availW / w, availH / h, 1);
  });

  // View zoom is folded into the layout scale (instead of a CSS transform) so
  // text and borders re-render crisply at any zoom, and screen px == preview px
  // keeps the cover-crop drag math below exact.
  const previewScale = computed(() => fitScale.value * viewZoom.value);

  const previewDims = computed(() => {
    const { w, h } = canvasDims.value;
    return {
      w: w * previewScale.value,
      h: h * previewScale.value,
    };
  });

  /** Canvas center in viewport coords (fitted canvas sits above the toolbar) */
  const canvasCenter = () => ({
    x: viewportSize.value.w / 2 + viewPan.value.x,
    y: (viewportSize.value.h - TOOLBAR_SPACE) / 2 + viewPan.value.y,
  });

  /** Zoom the workspace keeping the viewport point (px, py) fixed on screen */
  function zoomViewAt(target: number, px?: number, py?: number) {
    const next = clamp(target, VIEW_ZOOM_MIN, VIEW_ZOOM_MAX);
    const k = next / viewZoom.value;
    if (k === 1) return;
    const c = canvasCenter();
    const x = px ?? viewportSize.value.w / 2;
    const y = py ?? (viewportSize.value.h - TOOLBAR_SPACE) / 2;
    viewPan.value = {
      x: viewPan.value.x + (x - c.x) * (1 - k),
      y: viewPan.value.y + (y - c.y) * (1 - k),
    };
    viewZoom.value = next;
  }

  function zoomViewBy(factor: number) {
    zoomViewAt(viewZoom.value * factor);
  }

  function onViewWheel(e: WheelEvent) {
    if (!hasPhoto.value || !viewportRef.value) return;
    e.preventDefault();
    const rect = viewportRef.value.getBoundingClientRect();
    // Exponential so trackpads (many small deltas) and mice (big notches) both
    // feel proportional; delta clamped so a single notch never jumps too far.
    const delta = clamp(e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY, -100, 100);
    zoomViewAt(
      viewZoom.value * Math.exp(-delta * 0.0025),
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  }

  const viewDragging = ref(false);
  const viewDragStart = { x: 0, y: 0, px: 0, py: 0 };

  function onViewPanStart(e: PointerEvent) {
    if (!hasPhoto.value || (e.button !== 0 && e.button !== 1)) return;
    e.preventDefault();
    viewDragging.value = true;
    viewDragStart.x = e.clientX;
    viewDragStart.y = e.clientY;
    viewDragStart.px = viewPan.value.x;
    viewDragStart.py = viewPan.value.y;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onViewPanMove(e: PointerEvent) {
    if (!viewDragging.value) return;
    viewPan.value = {
      x: viewDragStart.px + (e.clientX - viewDragStart.x),
      y: viewDragStart.py + (e.clientY - viewDragStart.y),
    };
  }

  function onViewPanEnd() {
    viewDragging.value = false;
  }

  const canvasPositionStyle = computed(() => {
    const c = canvasCenter();
    return {
      position: "absolute" as const,
      left: `${Math.round(c.x - previewDims.value.w / 2)}px`,
      top: `${Math.round(c.y - previewDims.value.h / 2)}px`,
    };
  });

  const viewPercent = computed(() => Math.round(previewScale.value * 100));

  return {
    TOOLBAR_SPACE,
    viewportRef,
    viewZoom,
    viewDragging,
    previewScale,
    previewDims,
    viewPercent,
    canvasPositionStyle,
    resetView,
    zoomViewBy,
    onViewWheel,
    onViewPanStart,
    onViewPanMove,
    onViewPanEnd,
  };
};
