<script setup lang="ts">
import { computed } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { getResolvedConfig } from "~/composables/useTemplate";

const photoStore = usePhotoStore();

const selectedPhoto = computed(() => photoStore.selectedPhoto);

const templates = [
  { id: "classic", name: "Classic" },
  { id: "dark", name: "Dark" },
  { id: "minimal", name: "Minimal" },
  { id: "film-style", name: "Film Style" },
  { id: "card-style", name: "Card Style" },
  { id: "nord", name: "Nord" },
];

const resolvedTemplates = computed(() =>
  templates.map((tpl) => ({ ...tpl, config: getResolvedConfig(tpl.id) })),
);

const selectTemplate = (templateId: string) => {
  if (selectedPhoto.value) {
    photoStore.updatePhotoTemplate(selectedPhoto.value.id, templateId);
  }
};
</script>

<template>
  <div class="grid grid-cols-3 gap-1.5">
    <button
      v-for="tpl in resolvedTemplates"
      :key="tpl.id"
      type="button"
      class="flex flex-col gap-1 border p-1 text-left outline-none transition-colors focus-visible:border-nord-8"
      :class="
        selectedPhoto?.templateId === tpl.id
          ? 'border-nord-8 bg-nord-8/10'
          : 'border-nord-3 hover:border-nord-4'
      "
      :aria-pressed="selectedPhoto?.templateId === tpl.id"
      @click="selectTemplate(tpl.id)"
    >
      <div
        class="relative flex aspect-[4/3] w-full flex-col overflow-hidden"
        :style="{
          backgroundColor: tpl.config.backgroundColor,
          borderRadius: `${Math.min(tpl.config.borderRadius / 4, 6)}px`,
        }"
      >
        <div class="m-1 flex-1 bg-black/25" />
        <div
          class="flex h-3 items-center justify-around pb-0.5 text-[6px] font-bold"
          :style="{ color: tpl.config.fontColor, fontFamily: tpl.config.fontFamily }"
        >
          <span>A</span>
          <span>B</span>
          <span>C</span>
        </div>
      </div>
      <span
        class="truncate text-center text-[12px]"
        :class="selectedPhoto?.templateId === tpl.id ? 'text-nord-6' : 'text-nord-4'"
      >
        {{ tpl.name }}
      </span>
    </button>
  </div>
</template>
