<script setup lang="ts">
import { computed } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { PRESET_LIST, getResolvedConfig } from "~/composables/useTemplate";
import { withAutoLogo } from "~/composables/useLogoLibrary";
import { buildRenderTree, computeCanvasDims, exifEntriesFor } from "~~/shared/render";

const photoStore = usePhotoStore();
const selectedPhoto = computed(() => photoStore.selectedPhoto);

/** Thumbnail box, CSS px; each preset is drawn with the selected photo inside it */
const THUMB_W = 94;
const THUMB_H = 70;

const groups = computed(() => {
  const p = selectedPhoto.value;
  const cards = PRESET_LIST.map((preset) => {
    if (!p) return { ...preset, thumb: null };
    const cfg = withAutoLogo(getResolvedConfig(preset.id), p.exif);
    const full = computeCanvasDims({
      cfg,
      photoWidth: p.width,
      photoHeight: p.height,
      exifEntries: exifEntriesFor(p.exif, cfg.visibleFields as string[]),
      makeFallback: p.exif.make,
    });
    const scale = Math.min(THUMB_W / full.w, THUMB_H / full.h);
    const thumb = buildRenderTree(
      {
        photoBase64: p.thumbUrl,
        exifData: p.exif,
        templateConfig: cfg,
        photoWidth: p.width,
        photoHeight: p.height,
      },
      { scale },
    );
    return { ...preset, thumb };
  });
  return (["modern", "retro"] as const).map((group) => ({
    group,
    cards: cards.filter((c) => c.group === group),
  }));
});

const selectTemplate = (templateId: string) => {
  if (selectedPhoto.value) {
    photoStore.updatePhotoTemplate(selectedPhoto.value.id, templateId);
  }
};
</script>

<template>
  <div class="flex flex-col gap-3">
    <div v-for="g in groups" :key="g.group" class="flex flex-col gap-1.5">
      <span class="text-[12px] text-nord-4/60">{{ $t(`presets.${g.group}`) }}</span>
      <div class="grid grid-cols-3 gap-1.5">
        <button
          v-for="card in g.cards"
          :key="card.id"
          type="button"
          class="flex flex-col gap-1 border p-1 text-left outline-none transition-colors focus-visible:border-nord-8"
          :class="
            selectedPhoto?.templateId === card.id
              ? 'border-nord-8 bg-nord-8/10'
              : 'border-nord-3 hover:border-nord-4'
          "
          :aria-pressed="selectedPhoto?.templateId === card.id"
          @click="selectTemplate(card.id)"
        >
          <!-- The real preset, rendered by the exporter's own node tree -->
          <div
            class="pointer-events-none flex w-full items-center justify-center overflow-hidden bg-nord-0"
            :style="{ height: `${THUMB_H}px` }"
          >
            <RenderNodeView v-if="card.thumb" :node="card.thumb.nodeTree" />
          </div>
          <span
            class="truncate text-center text-[12px]"
            :class="selectedPhoto?.templateId === card.id ? 'text-nord-6' : 'text-nord-4'"
          >
            {{ $t(`presets.${card.id}`) }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
