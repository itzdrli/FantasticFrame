import { defineStore } from "pinia";
import type { Photo, PhotoCrop, TemplateConfig } from "~/types";

/**
 * Photo state management store
 *
 * Manages the lifecycle of all imported photos: add/remove/select, EXIF binding, template config overrides.
 */
export const usePhotoStore = defineStore("photos", () => {
  /** List of all photos */
  const photos = ref<Photo[]>([]);

  /** ID of the currently selected photo */
  const selectedId = ref<string | null>(null);

  // ==================== Getters ====================

  /** Currently selected photo */
  const selectedPhoto = computed(() => photos.value.find((p) => p.id === selectedId.value) ?? null);

  /** Total number of photos */
  const count = computed(() => photos.value.length);

  /** Whether there are any photos */
  const hasPhotos = computed(() => photos.value.length > 0);

  // ==================== Actions ====================

  /** Adds a photo */
  function addPhoto(photo: Photo) {
    photos.value.push(photo);
    // Auto-select the first photo
    if (photos.value.length === 1) {
      selectedId.value = photo.id;
    }
  }

  /** Adds multiple photos */
  function addPhotos(newPhotos: Photo[]) {
    const wasEmpty = photos.value.length === 0;
    photos.value.push(...newPhotos);
    if (wasEmpty && photos.value.length > 0) {
      selectedId.value = photos.value[0]!.id;
    }
  }

  /** Removes a photo */
  function removePhoto(id: string) {
    const index = photos.value.findIndex((p) => p.id === id);
    if (index === -1) return;

    photos.value.splice(index, 1);

    // If the removed photo was selected, select a neighboring photo
    if (selectedId.value === id) {
      if (photos.value.length === 0) {
        selectedId.value = null;
      } else {
        const newIndex = Math.min(index, photos.value.length - 1);
        selectedId.value = photos.value[newIndex]!.id;
      }
    }
  }

  /** Clears all photos */
  function clearAll() {
    photos.value = [];
    selectedId.value = null;
  }

  /** Selects the given photo */
  function selectPhoto(id: string) {
    if (photos.value.some((p) => p.id === id)) {
      selectedId.value = id;
    }
  }

  /** Updates a photo's template config overrides */
  function updateTemplateOverrides(id: string, overrides: Partial<TemplateConfig>) {
    const photo = photos.value.find((p) => p.id === id);
    if (photo) {
      photo.templateOverrides = {
        ...photo.templateOverrides,
        ...overrides,
      };
    }
  }

  /** Switches the template used by a photo */
  function setPhotoTemplate(id: string, templateId: string) {
    const photo = photos.value.find((p) => p.id === id);
    if (photo) {
      photo.templateId = templateId;
      // Clear per-photo overrides when switching templates
      photo.templateOverrides = undefined;
    }
  }

  /** Sets a photo's crop/zoom state */
  function setPhotoCrop(id: string, crop: PhotoCrop) {
    const photo = photos.value.find((p) => p.id === id);
    if (photo) {
      photo.crop = crop;
    }
  }

  /** Applies the same template to all photos */
  function applyTemplateToAll(templateId: string) {
    photos.value.forEach((photo) => {
      photo.templateId = templateId;
      photo.templateOverrides = undefined;
    });
  }

  return {
    // state
    photos,
    selectedId,
    // getters
    selectedPhoto,
    count,
    hasPhotos,
    // actions
    addPhoto,
    addPhotos,
    removePhoto,
    clearAll,
    selectPhoto,
    updateTemplateOverrides,
    /** Alias: components use updatePhotoOverrides */
    updatePhotoOverrides: updateTemplateOverrides,
    setPhotoTemplate,
    /** Alias: components use updatePhotoTemplate */
    updatePhotoTemplate: setPhotoTemplate,
    setPhotoCrop,
    applyTemplateToAll,
  };
});
