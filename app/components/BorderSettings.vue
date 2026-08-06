<script setup lang="ts">
import { computed, ref } from "vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { useTemplate } from "~/composables/useTemplate";
import type { TemplateConfig } from "~/types";

const photoStore = usePhotoStore();
const { getResolvedConfig } = useTemplate();

const selectedPhoto = computed(() => photoStore.selectedPhoto);
const templateId = computed(() => selectedPhoto.value?.templateId || "classic");
const overrides = computed(() => selectedPhoto.value?.templateOverrides || {});
const resolvedConfig = computed(() =>
  selectedPhoto.value ? getResolvedConfig(templateId.value, overrides.value) : null,
);

const update = <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => {
  if (selectedPhoto.value) {
    photoStore.updatePhotoOverrides(selectedPhoto.value.id, { [key]: value });
  }
};

// ── Corner Radius ───────────────────────────────────────────────────────────
const borderRadius = computed({
  get: () => overrides.value.borderRadius ?? resolvedConfig.value?.borderRadius ?? 0,
  set: (v) => update("borderRadius", v),
});

// ── Background ─────────────────────────────────────────────────────────────
const backgroundColor = computed({
  get: () => overrides.value.backgroundColor ?? resolvedConfig.value?.backgroundColor ?? "#ffffff",
  set: (v) => update("backgroundColor", v),
});

// ── Padding (independent) ───────────────────────────────────────────────────
// Three fully-decoupled sliders — no hidden "All around" sync writer, so
// dragging one never perturbs the others.
const paddingTop = computed({
  get: () => overrides.value.paddingTop ?? resolvedConfig.value?.paddingTop ?? 40,
  set: (v) => update("paddingTop", v),
});
const paddingBottom = computed({
  get: () => overrides.value.paddingBottom ?? resolvedConfig.value?.paddingBottom ?? 40,
  set: (v) => update("paddingBottom", v),
});
const paddingHorizontal = computed({
  get: () => overrides.value.paddingHorizontal ?? resolvedConfig.value?.paddingHorizontal ?? 40,
  set: (v) => update("paddingHorizontal", v),
});

// ── Logo ───────────────────────────────────────────────────────────────────
const showLogo = computed({
  get: () => overrides.value.showLogo ?? resolvedConfig.value?.showLogo ?? true,
  set: (v) => update("showLogo", v),
});
const logoPosition = computed({
  get: () => overrides.value.logoPosition ?? resolvedConfig.value?.logoPosition ?? "center",
  set: (v) => update("logoPosition", v),
});
const logoText = computed({
  get: () => overrides.value.logoText ?? resolvedConfig.value?.logoText ?? "",
  set: (v) => update("logoText", v),
});
const logoImageUrl = computed(
  () => overrides.value.logoImageUrl ?? resolvedConfig.value?.logoImageUrl ?? "",
);
const logoScale = computed({
  get: () => overrides.value.logoScale ?? resolvedConfig.value?.logoScale ?? 100,
  set: (v) => update("logoScale", v),
});

const logoImageInput = ref<HTMLInputElement | null>(null);

// Extract the intrinsic aspect ratio (width / height) from an SVG markup
// string. Checks viewBox first (most reliable for logos that use it, even
// when width/height are missing or set to "100%"), then falls back to the
// width/height attributes. Returns 0 if nothing usable is found.
function extractSvgAspect(svg: string): number {
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    if (doc.querySelector("parsererror")) return 0;
    const root = doc.documentElement;
    const vb = root.getAttribute("viewBox");
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        return parts[2] / parts[3];
      }
    }
    const wAttr = parseFloat(root.getAttribute("width") || "");
    const hAttr = parseFloat(root.getAttribute("height") || "");
    if (!Number.isNaN(wAttr) && !Number.isNaN(hAttr) && hAttr > 0) return wAttr / hAttr;
  } catch {
    /* ignore */
  }
  return 0;
}

// ── Paste SVG logo ──────────────────────────────────────────────────────────
const showPasteSvg = ref(false);
const svgInput = ref("");
const svgError = ref("");

function onLogoImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  if (isSvg) {
    const reader = new FileReader();
    reader.onload = () => loadSvg(reader.result as string);
    reader.readAsText(file);
  } else {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Probe the raster image's intrinsic dimensions, then store the aspect
      // ratio alongside the data URL so the renderer can size the logo
      // proportional to a single Scale % override.
      const img = new Image();
      img.onload = () => {
        const aspect =
          img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
        if (selectedPhoto.value) {
          photoStore.updatePhotoOverrides(selectedPhoto.value.id, {
            logoImageUrl: dataUrl,
            logoAspect: aspect || undefined,
            logoScale: 100,
          });
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }
}

function clearLogoImage() {
  if (!selectedPhoto.value) return;
  photoStore.updatePhotoOverrides(selectedPhoto.value.id, {
    logoImageUrl: "",
    logoAspect: undefined,
    logoScale: undefined,
  });
  svgSource.value = "";
  svgColor.value = "";
}

// ── SVG logo recoloring ─────────────────────────────────────────────────────
// svgSource keeps the raw markup so we can re-apply color overrides without
// round-tripping through base64 decode every time. svgColor is the user-chosen
// override; "" means "use original colors".
const svgSource = ref("");
const svgColor = ref("");

const isSvgLogo = computed(
  () => !!logoImageUrl.value && logoImageUrl.value.startsWith("data:image/svg+xml"),
);

// Encode raw SVG markup as a base64 data URL — matches what FileReader.readAsDataURL
// produces for an uploaded .svg file, so the client WASM renderer and the takumi
// native backend treat pasted and uploaded SVGs identically. Uses TextEncoder so
// non-Latin1 characters (CJK, accented letters) survive intact.
function encodeSvgDataUrl(svg: string): string {
  const bytes = new TextEncoder().encode(svg);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/svg+xml;base64,${btoa(bin)}`;
}

// Inverse of encodeSvgDataUrl: turn an `data:image/svg+xml;...` URL back into raw
// markup, so a saved photo's logo can be re-colored after a photo switch.
function decodeSvgDataUrl(url: string): string {
  try {
    if (url.startsWith("data:image/svg+xml;base64,")) {
      const b64 = url.slice("data:image/svg+xml;base64,".length);
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }
    const idx = url.indexOf(",");
    if (idx === -1) return "";
    return decodeURIComponent(url.slice(idx + 1));
  } catch {
    return "";
  }
}

// Walk every element in the SVG and replace non-"none" / non-"transparent"
// fills & strokes with `color`. Uses DOMParser so attribute-based SVGs
// (the common case for logo exports) are handled correctly; CSS-in-<style>
// SVGs would need a style override which we deliberately don't do — most
// users paste attribute-styled logos, and a global !important style would
// also clobber `fill="none"` outline-only paths.
//
// NB: for `stroke` we only override when an explicit attribute is present.
// SVG's default stroke is "none", so an element without `stroke="..."`
// has no outline — adding one would draw a thin border where there was
// none (visible artifact when recoloring a dark logo against a dark
// background). `fill`, on the other hand, defaults to black, so a missing
// fill attribute does need to be overridden to recolor the shape.
function applySvgColor(svg: string, color: string): string {
  if (!color) return svg;
  try {
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    if (doc.querySelector("parsererror")) return svg;
    doc.querySelectorAll("*").forEach((el) => {
      const fill = el.getAttribute("fill");
      if (fill !== "none" && fill !== "transparent") el.setAttribute("fill", color);
      const stroke = el.getAttribute("stroke");
      if (stroke !== null && stroke !== "" && stroke !== "none" && stroke !== "transparent") {
        el.setAttribute("stroke", color);
      }
    });
    return new XMLSerializer().serializeToString(doc);
  } catch {
    return svg;
  }
}

// Load a fresh SVG (from paste or upload) — caches the source, derives its
// intrinsic aspect ratio, resets color/scale, and writes the initial data URL.
function loadSvg(source: string) {
  svgSource.value = source;
  svgColor.value = "";
  const aspect = extractSvgAspect(source);
  if (selectedPhoto.value) {
    photoStore.updatePhotoOverrides(selectedPhoto.value.id, {
      logoAspect: aspect || undefined,
      logoScale: 100,
    });
  }
  refreshLogo();
}

function refreshLogo() {
  if (!svgSource.value) return;
  internalUpdate = true;
  update("logoImageUrl", encodeSvgDataUrl(applySvgColor(svgSource.value, svgColor.value)));
}

// Sync svgSource when the logo changes from outside this component (photo
// switch, undo/redo, etc.). `internalUpdate` guards our own refreshLogo
// writes so the watcher doesn't clobber svgColor mid-pick and recurse.
let internalUpdate = false;
watch(logoImageUrl, (url) => {
  if (internalUpdate) {
    internalUpdate = false;
    return;
  }
  if (url && url.startsWith("data:image/svg+xml")) {
    svgSource.value = decodeSvgDataUrl(url);
  } else {
    svgSource.value = "";
  }
  svgColor.value = "";
});

// Re-encode the logo whenever the user picks a new color
watch(svgColor, () => refreshLogo());

function applySvg() {
  const svg = svgInput.value.trim();
  if (!svg) {
    svgError.value = "Paste SVG markup first.";
    return;
  }
  if (!/<svg[\s>]/i.test(svg) || !/<\/svg>/i.test(svg)) {
    svgError.value = "Invalid SVG — must contain <svg>…</svg>.";
    return;
  }
  loadSvg(svg);
  showPasteSvg.value = false;
  svgInput.value = "";
  svgError.value = "";
}

function cancelSvgPaste() {
  showPasteSvg.value = false;
  svgInput.value = "";
  svgError.value = "";
}

// If the user pastes a clipboard file (e.g. an .svg copied in the file explorer)
// into the textarea, intercept and treat it as an upload instead of letting the
// textarea insert a useless filename string.
function onSvgPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
        const reader = new FileReader();
        if (isSvg) {
          reader.onload = () => {
            loadSvg(reader.result as string);
            showPasteSvg.value = false;
            svgInput.value = "";
            svgError.value = "";
          };
          reader.readAsText(file);
        } else {
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => {
              const aspect =
                img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
              if (selectedPhoto.value) {
                photoStore.updatePhotoOverrides(selectedPhoto.value.id, {
                  logoImageUrl: dataUrl,
                  logoAspect: aspect || undefined,
                  logoScale: 100,
                });
              }
              showPasteSvg.value = false;
              svgInput.value = "";
              svgError.value = "";
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  }
}

// ── Canvas ────────────────────────────────────────────────────────────────
const canvasMode = computed({
  get: () => overrides.value.canvasMode ?? resolvedConfig.value?.canvasMode ?? "original",
  set: (v) => update("canvasMode", v),
});
const socialRatio = computed({
  get: () => overrides.value.socialRatio ?? resolvedConfig.value?.socialRatio ?? "4:5",
  set: (v) => update("socialRatio", v),
});

// Preset ratios (landscape form only — use "Invert Ratio" for the portrait
// counterpart, e.g. 3:4 → 4:3). Keeps the button grid short while still
// covering every common camera/screen shape via a single invert tap.
const socialRatios: { label: string; value: string }[] = [
  { label: "1:1", value: "1:1" },
  { label: "4:3", value: "4:3" },
  { label: "3:4", value: "3:4" },
  { label: "16:9", value: "16:9" },
  { label: "21:9", value: "21:9" },
  { label: "1.91:1", value: "1.91:1" },
];

// Custom-ratio inputs. They mirror `socialRatio` when the current ratio is one
// of the presets' integer form; otherwise the user types new numbers and hits
// Apply. Keeping the W and H as separate number inputs (instead of a single
// "W:H" text field) avoids mid-edit states like "16:" that would be invalid.
const customW = ref<number | null>(null);
const customH = ref<number | null>(null);

const applyCustomRatio = () => {
  if (customW.value && customH.value && customW.value > 0 && customH.value > 0) {
    socialRatio.value = `${customW.value}:${customH.value}`;
  }
};

const socialDimsText = computed(() => {
  const known: Record<string, number> = {
    "1:1": 1080,
    "4:5": 1350,
    "5:4": 864,
    "3:4": 1440,
    "4:3": 810,
    "16:9": 608,
    "9:16": 1920,
    "21:9": 463,
    "9:21": 2520,
    "1.91:1": 565,
    "1:1.91": 2063,
  };
  const r = socialRatio.value;
  let h = known[r];
  if (!h) {
    const parts = r.split(":").map(Number);
    h =
      parts.length === 2 && parts[0] > 0 && parts[1] > 0
        ? Math.round((1080 * parts[1]) / parts[0])
        : 1350;
  }
  return `${r} → 1080×${h}`;
});

function invertSocialRatio() {
  const [a, b] = socialRatio.value.split(":");
  socialRatio.value = `${b}:${a}`;
}

function setCanvasMode(mode: "original" | "social") {
  if (!selectedPhoto.value) return;
  if (mode === "social") {
    photoStore.updatePhotoOverrides(selectedPhoto.value.id, {
      canvasMode: "social",
      socialPreset: "instagram",
    });
  } else {
    photoStore.updatePhotoOverrides(selectedPhoto.value.id, {
      canvasMode: "original",
    });
  }
}
</script>

<template>
  <div v-if="resolvedConfig" class="flex flex-col gap-5 text-sm text-nord-4">
    <!-- Background -->
    <div class="flex items-center justify-between">
      <span class="text-nord-5 font-medium">Background</span>
      <input
        type="color"
        v-model="backgroundColor"
        class="w-8 h-8 rounded cursor-pointer border border-nord-3 bg-nord-1 p-0.5"
      />
    </div>

    <!-- Corner Radius -->
    <div class="flex flex-col gap-3">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">Corner Radius</span>
      <div>
        <span class="text-xs text-nord-4 mb-1 block">Radius {{ borderRadius }}px</span>
        <input
          type="range"
          min="0"
          max="60"
          v-model.number="borderRadius"
          class="w-full accent-nord-8"
        />
      </div>
    </div>

    <!-- Padding -->
    <div class="flex flex-col gap-3">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">Padding</span>
      <div>
        <span class="text-xs text-nord-4 mb-1 block">Top {{ paddingTop }}px</span>
        <input
          type="range"
          min="0"
          max="200"
          v-model.number="paddingTop"
          class="w-full accent-nord-8"
        />
      </div>
      <div>
        <span class="text-xs text-nord-4 mb-1 block">Bottom {{ paddingBottom }}px</span>
        <input
          type="range"
          min="0"
          max="300"
          v-model.number="paddingBottom"
          class="w-full accent-nord-8"
        />
      </div>
      <div>
        <span class="text-xs text-nord-4 mb-1 block">Horizontal {{ paddingHorizontal }}px</span>
        <input
          type="range"
          min="0"
          max="200"
          v-model.number="paddingHorizontal"
          class="w-full accent-nord-8"
        />
      </div>
    </div>

    <!-- Aspect Ratio -->
    <div class="flex flex-col gap-2">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">Aspect Ratio</span>
      <div class="flex rounded-lg overflow-hidden border border-nord-3">
        <button
          @click="setCanvasMode('original')"
          class="flex-1 px-3 py-1.5 text-xs transition-colors"
          :class="
            canvasMode !== 'social'
              ? 'bg-nord-8 text-nord-0 font-medium'
              : 'bg-nord-2 text-nord-4 hover:bg-nord-3'
          "
        >
          Original
        </button>
        <button
          @click="setCanvasMode('social')"
          class="flex-1 px-3 py-1.5 text-xs transition-colors"
          :class="
            canvasMode === 'social'
              ? 'bg-nord-8 text-nord-0 font-medium'
              : 'bg-nord-2 text-nord-4 hover:bg-nord-3'
          "
        >
          1080w
        </button>
      </div>
      <div v-if="canvasMode === 'social'" class="grid grid-cols-3 gap-1">
        <button
          v-for="r in socialRatios"
          :key="r.value"
          @click="socialRatio = r.value"
          class="px-1 py-1.5 text-[11px] rounded-lg border transition-colors"
          :class="
            socialRatio === r.value
              ? 'border-nord-8 bg-nord-8/10 text-nord-8'
              : 'border-nord-3 bg-nord-2 text-nord-4 hover:border-nord-9 hover:text-nord-9'
          "
        >
          {{ r.label }}
        </button>
      </div>

      <!-- Custom ratio: two number inputs + Apply. Always shown beneath the
           presets in social mode so the user can dial in any W:H (e.g. 7:5)
           without it being a preset button. -->
      <div v-if="canvasMode === 'social'" class="flex items-center gap-2">
        <input
          v-model.number="customW"
          type="number"
          min="1"
          placeholder="W"
          class="w-full bg-nord-2 border border-nord-3 rounded-lg px-2 py-1.5 text-nord-6 text-xs focus:border-nord-8 focus:outline-none transition-colors placeholder:text-nord-6"
        />
        <span class="text-xs text-nord-4">:</span>
        <input
          v-model.number="customH"
          type="number"
          min="1"
          placeholder="H"
          class="w-full bg-nord-2 border border-nord-3 rounded-lg px-2 py-1.5 text-nord-6 text-xs focus:border-nord-8 focus:outline-none transition-colors placeholder:text-nord-6"
        />
        <button
          @click="applyCustomRatio"
          class="px-3 py-1.5 text-xs rounded-lg bg-nord-8 text-nord-0 font-medium hover:bg-nord-9 transition-colors shrink-0"
        >
          Apply
        </button>
      </div>
      <button
        v-if="canvasMode === 'social'"
        @click="invertSocialRatio"
        class="w-full py-1.5 text-[11px] rounded-lg border border-nord-3 bg-nord-2 text-nord-4 hover:border-nord-8 hover:text-nord-8 transition-colors flex items-center justify-center gap-1.5"
      >
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h5M20 20v-5h-5M5.07 9A8 8 0 019 4.07M19.93 15A8 8 0 0115 19.93"
          />
        </svg>
        Invert Ratio
      </button>
      <p class="text-[10px] text-nord-4/70">
        {{ canvasMode === "social" ? socialDimsText : "Follow the original ratio" }}
      </p>
    </div>

    <!-- Logo -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between border-b border-nord-2 pb-1">
        <span class="text-nord-5 font-medium">Logo</span>
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="showLogo" class="accent-nord-8 w-4 h-4" />
          <span class="text-xs">Show</span>
        </label>
      </div>

      <!-- Position (always available: positions the logo when shown, otherwise the parameters) -->
      <div class="flex items-center justify-between">
        <span class="text-xs text-nord-4">Position</span>
        <div class="flex rounded-lg overflow-hidden border border-nord-3">
          <button
            v-for="pos in ['left', 'center', 'right']"
            :key="pos"
            @click="logoPosition = pos as 'left' | 'center' | 'right'"
            class="px-3 py-1 text-xs transition-colors"
            :class="
              logoPosition === pos
                ? 'bg-nord-8 text-nord-0 font-medium'
                : 'bg-nord-2 text-nord-4 hover:bg-nord-3'
            "
          >
            {{ pos === "left" ? "Left" : pos === "center" ? "Center" : "Right" }}
          </button>
        </div>
      </div>
      <p v-if="!showLogo" class="text-[10px] text-nord-4/70">
        Logo not shown, position will be applied to parameters
      </p>

      <template v-if="showLogo">
        <!-- Logo image upload -->
        <div class="flex flex-col gap-2">
          <span class="text-xs text-nord-4">Logo Image (Priority over Text)</span>
          <div
            v-if="logoImageUrl"
            class="relative flex items-center gap-2 p-2 bg-nord-2 rounded-lg"
          >
            <img :src="logoImageUrl" class="h-8 object-contain max-w-[120px] rounded" />
            <button
              @click="clearLogoImage"
              class="ml-auto text-xs text-nord-11 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-nord-3"
            >
              Remove
            </button>
          </div>
          <template v-else>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="logoImageInput?.click()"
                class="py-2 border border-dashed border-nord-3 rounded-lg text-xs text-nord-4 hover:border-nord-8 hover:text-nord-8 transition-colors flex items-center justify-center gap-1.5"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Upload
              </button>
              <button
                @click="showPasteSvg = !showPasteSvg"
                class="py-2 border border-dashed border-nord-3 rounded-lg text-xs text-nord-4 hover:border-nord-8 hover:text-nord-8 transition-colors flex items-center justify-center gap-1.5"
                :class="{ 'border-nord-8 text-nord-8': showPasteSvg }"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Paste SVG
              </button>
            </div>

            <div v-if="showPasteSvg" class="flex flex-col gap-2">
              <textarea
                v-model="svgInput"
                @paste="onSvgPaste"
                placeholder="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>…</svg>"
                rows="5"
                spellcheck="false"
                class="w-full bg-nord-2 border border-nord-3 rounded-lg px-2 py-1.5 text-xs font-mono text-nord-6 focus:border-nord-8 focus:outline-none transition-colors placeholder:text-nord-6 resize-y"
              />
              <div class="flex gap-2">
                <button
                  @click="applySvg"
                  class="flex-1 py-1.5 rounded-lg text-xs font-medium bg-nord-8 text-nord-0 hover:bg-nord-9 transition-colors"
                >
                  Apply
                </button>
                <button
                  @click="cancelSvgPaste"
                  class="flex-1 py-1.5 rounded-lg text-xs bg-nord-2 text-nord-4 hover:bg-nord-3 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p v-if="svgError" class="text-[10px] text-nord-11">{{ svgError }}</p>
            </div>
          </template>
          <input
            ref="logoImageInput"
            type="file"
            accept="image/*,.svg"
            class="hidden"
            @change="onLogoImageChange"
          />

          <!-- Logo image size -->
          <template v-if="logoImageUrl">
            <div>
              <span class="text-xs text-nord-4 mb-1 block">Scale {{ logoScale }}%</span>
              <input
                type="range"
                min="20"
                max="300"
                v-model.number="logoScale"
                class="w-full accent-nord-8"
              />
            </div>

            <!-- SVG color override (only shown for SVG logos) -->
            <div v-if="isSvgLogo" class="flex items-center justify-between mt-1">
              <span class="text-xs text-nord-4">SVG Color</span>
              <div class="flex items-center gap-2">
                <button
                  v-if="svgColor"
                  @click="svgColor = ''"
                  class="text-[10px] text-nord-11 hover:text-red-400 transition-colors px-1.5 py-1 rounded hover:bg-nord-3"
                  title="Reset to original colors"
                >
                  Reset
                </button>
                <input
                  type="color"
                  :value="svgColor || '#000000'"
                  @input="svgColor = ($event.target as HTMLInputElement).value"
                  class="w-8 h-8 rounded cursor-pointer border border-nord-3 bg-nord-1 p-0.5"
                />
              </div>
            </div>
          </template>
        </div>

        <!-- Logo text (fallback) -->
        <div>
          <span class="text-xs text-nord-4 mb-1 block"
            >Logo Text (Leave blank to use camera brand)</span
          >
          <input
            type="text"
            v-model="logoText"
            placeholder="e.g. Fantastic Frame"
            class="w-full bg-nord-2 border border-nord-3 rounded-lg px-3 py-1.5 text-nord-6 text-xs focus:border-nord-8 focus:outline-none transition-colors placeholder:text-nord-6"
          />
        </div>
      </template>
    </div>
  </div>
  <div v-else class="text-nord-4 text-sm text-center py-8">Please select a photo first</div>
</template>
