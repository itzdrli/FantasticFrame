import { computed, type ComputedRef } from "vue";
import { getResolvedConfig } from "~/composables/useTemplate";
import { formatExifForDisplay } from "~/composables/useExifReader";
import { computeCanvasDims, estimateFooterLayout, layoutScaleFactor } from "~~/shared/render";
import type { Photo } from "~/types";

/**
 * Canvas / footer / photo geometry of the selected photo in 1080-base canvas
 * pixels, computed by the same shared functions the exporter uses so the live
 * preview can never drift from the exported image.
 */
export const usePreviewLayout = (photo: ComputedRef<Photo | null>) => {
  const templateConfig = computed(() => {
    if (!photo.value) return null;
    return getResolvedConfig(photo.value.templateId, photo.value.templateOverrides);
  });

  const parsedExif = computed(() => {
    if (!photo.value?.exif) return {};
    return formatExifForDisplay(photo.value.exif);
  });

  // Formatted EXIF strings for the configured visible fields — the same list
  // buildRenderTree rasterizes, so every estimation below agrees with export.
  const exifTexts = computed(() => {
    const cfg = templateConfig.value;
    if (!cfg) return [];
    return (cfg.visibleFields ?? [])
      .map((f) => parsedExif.value[f])
      .filter((v): v is string => !!v);
  });

  // 1080-base scale factor (see layoutScaleFactor in shared/render.ts):
  // social follows the canvas; original mode anchors to the photo's
  // longer edge so the preview can never drift from the exported image.
  const baseScaleFactor = computed(() => {
    const cfg = templateConfig.value;
    const p = photo.value;
    if (!cfg || !p) return 1;
    const { w, h } = canvasDims.value;
    return layoutScaleFactor({
      cfg,
      canvasWidth: w,
      canvasHeight: h,
      photoWidth: p.width,
      photoHeight: p.height,
    });
  });

  // Canvas dims for every mode — computed by the SAME function the server
  // renderer uses, so the preview box always matches the exported canvas.
  const canvasDims = computed(() => {
    if (!photo.value || !templateConfig.value) return { w: 0, h: 0 };
    return computeCanvasDims({
      cfg: templateConfig.value,
      photoWidth: photo.value.width,
      photoHeight: photo.value.height,
      exifValues: exifTexts.value,
      makeFallback: photo.value.exif.make,
    });
  });

  // Footer layout (height, paddings, logo size) — shared with buildRenderTree.
  const footerLayout = computed(() => {
    if (!photo.value || !templateConfig.value) return null;
    return estimateFooterLayout({
      cfg: templateConfig.value,
      scaleFactor: baseScaleFactor.value,
      canvasW: canvasDims.value.w,
      exifValues: exifTexts.value,
      makeFallback: photo.value.exif.make,
    });
  });

  const photoLayout = computed(() => {
    if (!photo.value || !templateConfig.value) return null;
    const cfg = templateConfig.value;
    const p = photo.value;
    const { w: canvasW, h: canvasH } = canvasDims.value;

    const scaleFactor = baseScaleFactor.value;
    const pt = (cfg.paddingTop ?? 0) * scaleFactor;
    const pb = (cfg.paddingBottom ?? 0) * scaleFactor;
    const ph = (cfg.paddingHorizontal ?? 0) * scaleFactor;

    const footerH = footerLayout.value?.footerH ?? 0;

    const availW = canvasW - ph * 2;
    const availH = Math.max(1, canvasH - footerH - pt - pb);
    const pAspect = p.width / p.height;

    let imgW: number;
    let imgH: number;
    if (availW > 0 && availH > 0 && pAspect > availW / availH) {
      imgW = availW;
      imgH = Math.round(availW / pAspect);
    } else {
      imgH = availH;
      imgW = Math.round(availH * pAspect);
    }

    return { imgW, imgH, availW, availH };
  });

  return {
    templateConfig,
    parsedExif,
    exifTexts,
    baseScaleFactor,
    canvasDims,
    footerLayout,
    photoLayout,
  };
};
