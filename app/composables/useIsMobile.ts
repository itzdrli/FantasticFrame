import { onBeforeUnmount, onMounted, ref } from "vue";

/** Matches Tailwind's `md` breakpoint: below it the drawers become bottom sheets */
const MOBILE_QUERY = "(max-width: 767px)";

/** Reactive "phone-sized viewport" flag; false during SSR and before mount. */
export const useIsMobile = () => {
  const isMobile = ref(false);
  let mql: MediaQueryList | null = null;
  const sync = () => {
    isMobile.value = !!mql?.matches;
  };

  onMounted(() => {
    mql = window.matchMedia(MOBILE_QUERY);
    sync();
    mql.addEventListener("change", sync);
  });
  onBeforeUnmount(() => mql?.removeEventListener("change", sync));

  return isMobile;
};
