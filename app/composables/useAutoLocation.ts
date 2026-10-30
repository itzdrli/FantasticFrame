import { watch } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { getResolvedConfig } from "~/composables/useTemplate";
import { reverseGeocode } from "~/utils/geocode";
import type { Photo } from "~/types";

/**
 * Fills in `exif.location` from GPS for photos whose caption shows the
 * "location" field. Lazy on purpose: the lookup sends rounded coordinates to
 * OpenStreetMap (via our server), so it only happens once the user has asked
 * for a location, never just because a photo with GPS was imported. A photo
 * is looked up once; clearing the field afterwards keeps it empty.
 */
export function useAutoLocation() {
  const photoStore = usePhotoStore();
  const tried = new Set<string>();

  const wantsLocation = (p: Photo) =>
    p.exif.latitude != null &&
    p.exif.longitude != null &&
    p.exif.location === undefined &&
    !tried.has(p.id) &&
    (getResolvedConfig(p.templateId, p.templateOverrides).visibleFields as string[]).includes(
      "location",
    );

  watch(
    () => photoStore.photos.filter(wantsLocation),
    (photos) => {
      for (const p of photos) {
        tried.add(p.id);
        void reverseGeocode(p.exif.latitude!, p.exif.longitude!).then((res) => {
          if (!res.ok) {
            tried.delete(p.id); // retried on the next change
            return;
          }
          // The user may have typed a place in the meantime
          const current = photoStore.photos.find((x) => x.id === p.id);
          if (res.place && current && current.exif.location === undefined) {
            photoStore.setPhotoLocation(p.id, res.place);
          }
        });
      }
    },
    { immediate: true },
  );
}
