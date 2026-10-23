import { computed } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { getResolvedConfig } from "~/composables/useTemplate";
import type { TemplateConfig } from "~/types";

/**
 * The selected photo's template state shared by the settings panels: its
 * overrides layered over the resolved template, plus a writer that stores a
 * single override on that photo.
 */
export const useSelectedTemplate = () => {
  const photoStore = usePhotoStore();

  const selectedPhoto = computed(() => photoStore.selectedPhoto);
  const templateId = computed(() => selectedPhoto.value?.templateId || "classic");
  const overrides = computed(() => selectedPhoto.value?.templateOverrides || {});
  const resolvedConfig = computed(() =>
    selectedPhoto.value ? getResolvedConfig(templateId.value, overrides.value) : null,
  );

  /** The untouched template: what a reset returns each value to */
  const defaults = computed(() =>
    selectedPhoto.value ? getResolvedConfig(templateId.value) : null,
  );

  const update = <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => {
    if (selectedPhoto.value) {
      photoStore.updatePhotoOverrides(selectedPhoto.value.id, { [key]: value });
    }
  };

  /** Merges several overrides onto the selected photo in one write */
  const updateMany = (patch: Partial<TemplateConfig>) => {
    if (selectedPhoto.value) photoStore.updatePhotoOverrides(selectedPhoto.value.id, patch);
  };

  return { selectedPhoto, overrides, resolvedConfig, defaults, update, updateMany };
};
