import { computed, ref } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { useExifReader } from "~/composables/useExifReader";
import { importImageFiles } from "~/utils/photoImport";
import { clonePhotoStyle } from "~/utils/photoStyle";

/**
 * Photo import with progress and a "skipped" notice, shared by the empty-state
 * dropzone and the filmstrip's add button. New photos inherit the selected
 * photo's style.
 */
export const usePhotoImport = () => {
  const photoStore = usePhotoStore();
  const { readExif } = useExifReader();

  const isImporting = ref(false);
  const importProgress = ref({ current: 0, total: 0 });
  const skippedFiles = ref<{ name: string; reason: string }[]>([]);
  let clearTimer: ReturnType<typeof setTimeout> | null = null;

  async function importFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0 || isImporting.value) return;

    isImporting.value = true;
    importProgress.value = { current: 0, total: imageFiles.length };
    try {
      const result = await importImageFiles(
        imageFiles,
        readExif,
        (photo) => photoStore.addPhoto(photo),
        (done) => {
          importProgress.value.current = done;
        },
        3,
        clonePhotoStyle(photoStore.selectedPhoto),
      );
      skippedFiles.value = result.skipped;
      if (clearTimer) clearTimeout(clearTimer);
      if (result.skipped.length > 0) {
        clearTimer = setTimeout(() => (skippedFiles.value = []), 6000);
      }
    } finally {
      isImporting.value = false;
    }
  }

  const importPercent = computed(() =>
    importProgress.value.total === 0
      ? 0
      : Math.round((importProgress.value.current / importProgress.value.total) * 100),
  );

  return { isImporting, importProgress, importPercent, skippedFiles, importFiles };
};
