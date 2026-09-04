import { defineStore } from "pinia";
import {
  DEFAULT_ACTIVE_CATEGORIES,
  ALL_SYNC_CATEGORIES,
  filterOverridesByCategories,
  mergeTemplateOverrides,
  preserveLogoOverridesOnTemplateSwitch,
  SYNC_CATEGORIES,
  type SyncCategory,
} from "~/utils/photoStyle";
import { useTemplate } from "~/composables/useTemplate";
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

  /** When on, later style edits write to every photo, filtered by syncCategories. */
  const syncStyle = ref(false);

  /** Active categories for sync & apply */
  const syncCategories = ref<SyncCategory[]>([...DEFAULT_ACTIVE_CATEGORIES]);

  const { getResolvedConfig } = useTemplate();

  function setSyncCategories(cats: SyncCategory[]) {
    syncCategories.value = [...cats];
  }

  function toggleSyncCategory(cat: SyncCategory) {
    const idx = syncCategories.value.indexOf(cat);
    if (idx >= 0) {
      syncCategories.value.splice(idx, 1);
    } else {
      syncCategories.value.push(cat);
    }
  }

  function selectAllCategories() {
    syncCategories.value = [...ALL_SYNC_CATEGORIES];
  }

  function clearAllCategories() {
    syncCategories.value = [];
  }

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

  function mergeOverrides(photo: Photo, overrides: Partial<TemplateConfig>) {
    photo.templateOverrides = mergeTemplateOverrides(photo.templateOverrides, overrides);
  }

  /** Updates a photo's template config overrides (or every photo when syncStyle is on, filtered by syncCategories) */
  function updateTemplateOverrides(id: string, overrides: Partial<TemplateConfig>) {
    if (syncStyle.value) {
      const syncablePatch = filterOverridesByCategories(overrides, syncCategories.value);
      const currentPhoto = photos.value.find((p) => p.id === id);
      if (currentPhoto) mergeOverrides(currentPhoto, overrides);

      if (Object.keys(syncablePatch).length > 0) {
        photos.value.forEach((p) => {
          if (p.id !== id) mergeOverrides(p, syncablePatch);
        });
      }
      return;
    }
    const photo = photos.value.find((p) => p.id === id);
    if (photo) mergeOverrides(photo, overrides);
  }

  /**
   * Retargets a photo to a new template. A user-added logo (content, size,
   * visibility) survives the switch — see preserveLogoOverridesOnTemplateSwitch;
   * everything else resets to the new template's defaults and its position.
   */
  function switchPhotoTemplate(photo: Photo, templateId: string) {
    photo.templateOverrides = preserveLogoOverridesOnTemplateSwitch(
      photo.templateOverrides,
      getResolvedConfig(photo.templateId, photo.templateOverrides),
      getResolvedConfig(templateId),
    );
    photo.templateId = templateId;
  }

  /** Switches the template used by a photo */
  function setPhotoTemplate(id: string, templateId: string) {
    if (syncStyle.value && syncCategories.value.includes("template")) {
      photos.value.forEach((photo) => switchPhotoTemplate(photo, templateId));
      return;
    }

    const photo = photos.value.find((p) => p.id === id);
    if (photo) switchPhotoTemplate(photo, templateId);
  }

  /** Sets a photo's crop/zoom state */
  function setPhotoCrop(id: string, crop: PhotoCrop) {
    const photo = photos.value.find((p) => p.id === id);
    if (photo) {
      photo.crop = crop;
    }
  }

  /** Applies the same template to all photos (user logos preserved per photo) */
  function applyTemplateToAll(templateId: string) {
    photos.value.forEach((photo) => switchPhotoTemplate(photo, templateId));
  }

  /**
   * Copies the selected photo's template + style overrides onto every other photo,
   * filtered by chosen categories (defaults to active syncCategories).
   * Crop is left alone.
   */
  function applyStyleToAll(categories: SyncCategory[] = syncCategories.value) {
    const src = selectedPhoto.value;
    if (!src) return;

    const keysToReplace = new Set<keyof TemplateConfig>();
    for (const cat of SYNC_CATEGORIES) {
      if (categories.includes(cat.id)) {
        for (const k of cat.keys) keysToReplace.add(k);
      }
    }

    const srcPatch = filterOverridesByCategories(src.templateOverrides, categories);

    photos.value.forEach((photo) => {
      if (photo.id === src.id) return;

      if (categories.includes("template")) {
        photo.templateId = src.templateId;
      }

      const preserved: Partial<TemplateConfig> = { ...photo.templateOverrides };
      for (const k of keysToReplace) {
        delete preserved[k];
      }

      const merged = mergeTemplateOverrides(preserved, srcPatch);
      photo.templateOverrides = Object.keys(merged).length > 0 ? merged : undefined;
    });
  }

  return {
    // state
    photos,
    selectedId,
    syncStyle,
    syncCategories,
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
    applyStyleToAll,
    setSyncCategories,
    toggleSyncCategory,
    selectAllCategories,
    clearAllCategories,
  };
});
