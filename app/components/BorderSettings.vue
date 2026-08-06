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

// ── Padding (unified) ──────────────────────────────────────────────────────
// We expose a single "uniform padding" slider that keeps top/bottom/horizontal in sync
// Users can still fine-tune via individual sliders below
const padding = computed({
  get: () => {
    const t = overrides.value.paddingTop ?? resolvedConfig.value?.paddingTop ?? 40;
    const b = overrides.value.paddingBottom ?? resolvedConfig.value?.paddingBottom ?? 40;
    const h = overrides.value.paddingHorizontal ?? resolvedConfig.value?.paddingHorizontal ?? 40;
    return Math.round((t + b + h) / 3);
  },
  set: (v) => {
    if (selectedPhoto.value) {
      photoStore.updatePhotoOverrides(selectedPhoto.value.id, {
        paddingTop: v,
        paddingBottom: v,
        paddingHorizontal: v,
      });
    }
  },
});

const paddingBottom = computed({
  get: () => overrides.value.paddingBottom ?? resolvedConfig.value?.paddingBottom ?? 40,
  set: (v) => update("paddingBottom", v),
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
const defaultModelFontSize = computed(
  () => overrides.value.modelFontSize ?? resolvedConfig.value?.modelFontSize ?? 20,
);
const logoWidth = computed({
  get: () =>
    overrides.value.logoWidth ?? resolvedConfig.value?.logoWidth ?? defaultModelFontSize.value * 5,
  set: (v) => update("logoWidth", v),
});
const logoHeight = computed({
  get: () =>
    overrides.value.logoHeight ??
    resolvedConfig.value?.logoHeight ??
    Math.round(defaultModelFontSize.value * 1.4),
  set: (v) => update("logoHeight", v),
});

const logoImageInput = ref<HTMLInputElement | null>(null);

function onLogoImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    update("logoImageUrl", reader.result as string);
  };
  reader.readAsDataURL(file);
}

function clearLogoImage() {
  update("logoImageUrl", "");
}

// ── Paste SVG logo ──────────────────────────────────────────────────────────
const showPasteSvg = ref(false);
const svgInput = ref("");
const svgError = ref("");

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
  update("logoImageUrl", encodeSvgDataUrl(svg));
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
        const reader = new FileReader();
        reader.onload = () => {
          update("logoImageUrl", reader.result as string);
          showPasteSvg.value = false;
          svgInput.value = "";
          svgError.value = "";
        };
        reader.readAsDataURL(file);
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

const socialRatios: {
  label: string;
  value: "1:1" | "4:5" | "3:4" | "1.91:1" | "5:4" | "4:3" | "1:1.91";
}[] = [
  { label: "1:1", value: "1:1" },
  { label: "4:5", value: "4:5" },
  { label: "1.91:1", value: "1.91:1" },
  { label: "3:4", value: "3:4" },
];

const socialDimsText = computed(() => {
  const heights: Record<string, number> = {
    "1:1": 1080,
    "4:5": 1350,
    "5:4": 864,
    "3:4": 1440,
    "4:3": 810,
    "1.91:1": 565,
    "1:1.91": 2063,
  };
  return `Ins ${socialRatio.value} → 1080×${heights[socialRatio.value] || 1350}`;
});

function invertSocialRatio() {
  const [a, b] = socialRatio.value.split(":");
  socialRatio.value = `${b}:${a}` as typeof socialRatio.value;
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
        <span class="text-xs text-nord-4 mb-1 block">All around {{ padding }}px</span>
        <input
          type="range"
          min="0"
          max="200"
          v-model.number="padding"
          class="w-full accent-nord-8"
        />
      </div>
      <div>
        <span class="text-xs text-nord-4 mb-1 block">Bottom Additional {{ paddingBottom }}px</span>
        <input
          type="range"
          min="0"
          max="300"
          v-model.number="paddingBottom"
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
          Ins
        </button>
      </div>
      <div v-if="canvasMode === 'social'" class="grid grid-cols-4 gap-1">
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
                class="w-full bg-nord-2 border border-nord-3 rounded-lg px-2 py-1.5 text-xs font-mono text-nord-4 focus:border-nord-8 focus:outline-none transition-colors placeholder:text-nord-3 resize-y"
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
              <span class="text-xs text-nord-4 mb-1 block">Image Width {{ logoWidth }}px</span>
              <input
                type="range"
                min="20"
                max="400"
                v-model.number="logoWidth"
                class="w-full accent-nord-8"
              />
            </div>
            <div>
              <span class="text-xs text-nord-4 mb-1 block">Image Height {{ logoHeight }}px</span>
              <input
                type="range"
                min="10"
                max="200"
                v-model.number="logoHeight"
                class="w-full accent-nord-8"
              />
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
            class="w-full bg-nord-2 border border-nord-3 rounded-lg px-3 py-1.5 text-nord-4/70 text-xs focus:border-nord-8 focus:outline-none transition-colors placeholder:text-nord-3"
          />
        </div>
      </template>
    </div>
  </div>
  <div v-else class="text-nord-4 text-sm text-center py-8">Please select a photo first</div>
</template>
