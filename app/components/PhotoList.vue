<script setup lang="ts">
import { ref } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { useExifReader } from "~/composables/useExifReader";
import { uuid } from "~/utils/uuid";

const photoStore = usePhotoStore();
const { readExif } = useExifReader();

const fileInput = ref<HTMLInputElement | null>(null);
const isImporting = ref(false);
const importProgress = ref({ current: 0, total: 0 });

const selectPhoto = (id: string) => {
  photoStore.selectPhoto(id);
};

const removePhoto = (id: string, event: Event) => {
  event.stopPropagation();
  photoStore.removePhoto(id);
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = dataUrl;
  });
}

async function handleFiles(files: FileList | File[]) {
  const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
  if (imageFiles.length === 0) return;

  isImporting.value = true;
  importProgress.value = { current: 0, total: imageFiles.length };

  for (let i = 0; i < imageFiles.length; i++) {
    const file = imageFiles[i];
    importProgress.value.current = i;
    try {
      const [exif, dataUrl] = await Promise.all([readExif(file), fileToDataUrl(file)]);
      const { width, height } = await getImageDimensions(dataUrl);
      photoStore.addPhoto({
        id: uuid(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        dataUrl,
        width,
        height,
        exif,
        templateId: "classic",
        crop: { fitMode: "cover", scale: 1, offsetX: 0, offsetY: 0 },
        addedAt: new Date(),
      });
    } catch (err) {
      console.error("[FantasticFrame] import failed:", file.name, err);
    }
    importProgress.value.current = i + 1;
  }

  isImporting.value = false;
}

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files) {
    handleFiles(target.files);
    target.value = "";
  }
};

const importPercent = computed(() => {
  if (!isImporting.value || importProgress.value.total === 0) return 0;
  return Math.round((importProgress.value.current / importProgress.value.total) * 100);
});
</script>

<template>
  <div class="w-full flex items-center gap-2 h-full">
    <!-- Add photo button -->
    <button
      @click="fileInput?.click()"
      :disabled="isImporting"
      class="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-nord-3 hover:border-nord-8 hover:bg-nord-2 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
      title="Add Photo"
    >
      <template v-if="!isImporting">
        <svg
          class="w-6 h-6 text-nord-3 group-hover:text-nord-8 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span class="text-[10px] text-nord-3 group-hover:text-nord-8 transition-colors">Add</span>
      </template>
      <template v-else>
        <!-- Import progress -->
        <div class="flex flex-col items-center justify-center gap-1">
          <svg class="w-5 h-5 animate-spin text-nord-8" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span class="text-[10px] text-nord-8"
            >{{ importProgress.current }}/{{ importProgress.total }}</span
          >
        </div>
      </template>
    </button>

    <!-- Photo list -->
    <div
      class="flex-1 overflow-x-auto flex gap-3 py-2 scrollbar-thin scrollbar-thumb-nord-2 scrollbar-track-nord-0"
    >
      <div
        v-for="photo in photoStore.photos"
        :key="photo.id"
        class="relative group shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all w-20 h-20 bg-nord-1 border border-nord-2"
        :class="{ 'ring-2 ring-nord-8 border-nord-8': photoStore.selectedId === photo.id }"
        @click="selectPhoto(photo.id)"
      >
        <img :src="photo.dataUrl" alt="" class="w-full h-full object-cover" />

        <!-- Delete Button -->
        <button
          @click="removePhoto(photo.id, $event)"
          class="absolute top-1 right-1 w-5 h-5 rounded-full bg-nord-11 text-nord-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs shadow-md z-10 hover:bg-red-500"
        >
          &times;
        </button>

        <!-- Filename Overlay -->
        <div
          class="absolute bottom-0 left-0 right-0 bg-nord-0/80 backdrop-blur-sm text-nord-6 text-[10px] px-1 py-0.5 truncate text-center"
        >
          {{ photo.fileName }}
        </div>
      </div>

      <div
        v-if="photoStore.photos.length === 0"
        class="flex items-center justify-center text-nord-4 text-sm min-w-[160px]"
      >
        No photos yet, click + to add
      </div>
    </div>

    <input
      type="file"
      ref="fileInput"
      class="hidden"
      multiple
      accept="image/*"
      @change="onFileChange"
    />
  </div>
</template>
