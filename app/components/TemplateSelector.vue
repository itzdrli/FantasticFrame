<script setup lang="ts">
import { computed } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { useTemplate } from "~/composables/useTemplate";

const photoStore = usePhotoStore();
const { getResolvedConfig } = useTemplate();

const selectedPhoto = computed(() => photoStore.selectedPhoto);

const templates = [
  { id: "classic", name: "Classic" },
  { id: "dark", name: "Dark" },
  { id: "minimal", name: "Minimal" },
  { id: "film-style", name: "Film Style" },
  { id: "card-style", name: "Card Style" },
];

const selectTemplate = (templateId: string) => {
  if (selectedPhoto.value) {
    photoStore.updatePhotoTemplate(selectedPhoto.value.id, templateId);
  }
};
</script>

<template>
  <div class="flex flex-col gap-4">
    <h3 class="text-nord-6 text-sm font-medium">Select Template</h3>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <button
        v-for="tpl in templates"
        :key="tpl.id"
        @click="selectTemplate(tpl.id)"
        class="flex flex-col items-center gap-2 rounded-lg p-2 transition-all duration-200 bg-nord-1 border border-nord-2 hover:border-nord-3 focus:outline-none"
        :class="{ 'ring-2 ring-nord-8 border-nord-8': selectedPhoto?.templateId === tpl.id }"
      >
        <div
          class="w-full aspect-[4/3] rounded shadow-inner flex flex-col justify-between overflow-hidden relative"
          :style="{
            backgroundColor: getResolvedConfig(tpl.id).backgroundColor,
            borderColor: getResolvedConfig(tpl.id).borderColor,
            borderWidth: `${getResolvedConfig(tpl.id).borderWidth}px`,
            borderRadius: `${getResolvedConfig(tpl.id).borderRadius}px`,
          }"
        >
          <div class="flex-1 m-1 bg-nord-3 rounded-sm opacity-50"></div>
          <div
            class="flex justify-around items-center h-4 pb-1 text-[8px] font-bold"
            :style="{
              color: getResolvedConfig(tpl.id).fontColor,
              fontFamily: getResolvedConfig(tpl.id).fontFamily,
            }"
          >
            <span>A</span>
            <span>B</span>
            <span>C</span>
          </div>
        </div>
        <span class="text-xs text-nord-4">{{ tpl.name }}</span>
      </button>
    </div>
  </div>
</template>
