import { computed, type ComputedRef } from "vue";
import { renderConfigFor } from "~/composables/useLogoLibrary";
import { computeFrameGeometry, exifEntriesFor } from "~~/shared/render";
import type { Photo } from "~/types";

/**
 * Canvas and photo geometry of the selected photo in full-resolution canvas
 * pixels, computed by the same shared function the exporter uses so the live
 * preview can never drift from the exported image.
 */
export const usePreviewLayout = (photo: ComputedRef<Photo | null>) => {
  const templateConfig = computed(() => (photo.value ? renderConfigFor(photo.value) : null));

  const geometry = computed(() => {
    const p = photo.value;
    const cfg = templateConfig.value;
    if (!p || !cfg) return null;
    return computeFrameGeometry({
      cfg,
      photoWidth: p.width,
      photoHeight: p.height,
      exifEntries: exifEntriesFor(p.exif, cfg.visibleFields as string[]),
      makeFallback: p.exif.make,
    });
  });

  const canvasDims = computed(() =>
    geometry.value ? { w: geometry.value.canvasW, h: geometry.value.canvasH } : { w: 0, h: 0 },
  );

  /** The box the photo is fitted into — the crop tool pans within it */
  const photoLayout = computed(() => {
    const g = geometry.value;
    return g ? { availW: g.availW, availH: g.availH, imgW: g.imgW, imgH: g.imgH } : null;
  });

  return { templateConfig, canvasDims, photoLayout };
};
