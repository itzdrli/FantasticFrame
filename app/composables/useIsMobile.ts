import { onBeforeUnmount, onMounted, ref } from "vue";

/** Matches Tailwind's `md` breakpoint: phone-sized chrome (compact header) */
const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Bottom-sheet editor layout: phones and portrait tablets. Must equal the
 * `sheet` custom variant in app/assets/css/main.css, which lays out the page
 * before this flag is known (SSR, pre-mount).
 */
const SHEET_QUERY = "(max-width: 1023px), (orientation: portrait) and (max-width: 1365px)";

/** Reactive media-query flag; false during SSR and before mount. */
const useMediaQuery = (query: string) => {
  const matches = ref(false);
  let mql: MediaQueryList | null = null;
  const sync = () => {
    matches.value = !!mql?.matches;
  };

  onMounted(() => {
    mql = window.matchMedia(query);
    sync();
    mql.addEventListener("change", sync);
  });
  onBeforeUnmount(() => mql?.removeEventListener("change", sync));

  return matches;
};

export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);

export const useSheetLayout = () => useMediaQuery(SHEET_QUERY);
