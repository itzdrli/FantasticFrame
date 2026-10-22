<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  applySvgColor,
  decodeSvgDataUrl,
  encodeSvgDataUrl,
  extractSvgAspect,
} from "~/utils/svgLogo";

const { t } = useI18n();
const { overrides, resolvedConfig, update, updateMany } = useSelectedTemplate();

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

/** Parameter (EXIF) text color — target for the "Use Font Color" SVG-logo button */
const fontColor = computed(
  () => overrides.value.fontColor ?? resolvedConfig.value?.fontColor ?? "#000000",
);

const logoImageInput = ref<HTMLInputElement | null>(null);

// ── Paste SVG logo ──────────────────────────────────────────────────────────
const showPasteSvg = ref(false);
const svgInput = ref("");
const svgError = ref("");

function clearLogoImage() {
  updateMany({ logoImageUrl: "", logoAspect: undefined, logoScale: undefined });
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

// Load a fresh SVG (from paste or upload) — caches the source, derives its
// intrinsic aspect ratio, resets color/scale, and writes the initial data URL.
function loadSvg(source: string) {
  svgSource.value = source;
  svgColor.value = "";
  const aspect = extractSvgAspect(source);
  updateMany({ logoAspect: aspect || undefined, logoScale: 100 });
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
    svgError.value = t("border.errSvgEmpty");
    return;
  }
  if (!/<svg[\s>]/i.test(svg) || !/<\/svg>/i.test(svg)) {
    svgError.value = t("border.errSvgInvalid");
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

// Loads an uploaded or pasted logo file: SVGs keep their markup (so they can be
// recolored), rasters are stored as a data URL together with their intrinsic
// aspect ratio so the renderer can size them from a single Scale % override.
function importLogoFile(file: File, onDone?: () => void) {
  const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
  const reader = new FileReader();
  if (isSvg) {
    reader.onload = () => {
      loadSvg(reader.result as string);
      onDone?.();
    };
    reader.readAsText(file);
    return;
  }
  reader.onload = () => {
    const dataUrl = reader.result as string;
    const img = new Image();
    img.onload = () => {
      const aspect =
        img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
      updateMany({ logoImageUrl: dataUrl, logoAspect: aspect || undefined, logoScale: 100 });
      onDone?.();
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function onLogoImageChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) importLogoFile(file);
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
        importLogoFile(file, cancelSvgPaste);
        return;
      }
    }
  }
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between border-b border-nord-2 pb-1">
      <span class="text-nord-5 font-medium">{{ $t("border.logo") }}</span>
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" v-model="showLogo" class="accent-nord-8 w-4 h-4" />
        <span class="text-xs">{{ $t("border.show") }}</span>
      </label>
    </div>

    <!-- Position (always available: positions the logo when shown, otherwise the parameters) -->
    <div class="flex items-center justify-between">
      <span class="text-xs text-nord-4">{{ $t("border.position") }}</span>
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
          {{
            $t(
              pos === "left"
                ? "border.positionLeft"
                : pos === "center"
                  ? "border.positionCenter"
                  : "border.positionRight",
            )
          }}
        </button>
      </div>
    </div>
    <p v-if="!showLogo" class="text-[10px] text-nord-4/70">
      {{ $t("border.logoHiddenHint") }}
    </p>

    <template v-if="showLogo">
      <!-- Logo image upload -->
      <div class="flex flex-col gap-2">
        <span class="text-xs text-nord-4">{{ $t("border.logoImage") }}</span>
        <div v-if="logoImageUrl" class="relative flex items-center gap-2 p-2 bg-nord-2 rounded-lg">
          <img :src="logoImageUrl" class="h-8 object-contain max-w-30 rounded" />
          <button
            @click="clearLogoImage"
            class="ml-auto text-xs text-nord-11 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-nord-3"
          >
            {{ $t("border.remove") }}
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
              {{ $t("border.upload") }}
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
              {{ $t("border.pasteSvg") }}
            </button>
          </div>

          <div v-if="showPasteSvg" class="flex flex-col gap-2">
            <textarea
              v-model="svgInput"
              @paste="onSvgPaste"
              :placeholder="$t('border.svgPlaceholder')"
              rows="5"
              spellcheck="false"
              class="w-full bg-nord-2 border border-nord-3 rounded-lg px-2 py-1.5 text-xs font-mono text-nord-6 focus:border-nord-8 focus:outline-none transition-colors placeholder:text-nord-6 resize-y"
            />
            <div class="flex gap-2">
              <button
                @click="applySvg"
                class="flex-1 py-1.5 rounded-lg text-xs font-medium bg-nord-8 text-nord-0 hover:bg-nord-9 transition-colors"
              >
                {{ $t("border.apply") }}
              </button>
              <button
                @click="cancelSvgPaste"
                class="flex-1 py-1.5 rounded-lg text-xs bg-nord-2 text-nord-4 hover:bg-nord-3 transition-colors"
              >
                {{ $t("border.cancel") }}
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
          <SliderField
            v-model="logoScale"
            :label="$t('border.scale')"
            :min="20"
            :max="300"
            suffix="%"
          />

          <!-- SVG color override (only shown for SVG logos) -->
          <div v-if="isSvgLogo" class="flex items-center justify-between mt-1">
            <span class="text-xs text-nord-4">{{ $t("border.svgColor") }}</span>
            <div class="flex items-center gap-2">
              <button
                v-if="svgColor"
                @click="svgColor = ''"
                class="text-[10px] text-nord-11 hover:text-red-400 transition-colors px-1.5 py-1 rounded hover:bg-nord-3"
                title="Reset to original colors"
              >
                {{ $t("border.reset") }}
              </button>
              <button
                @click="svgColor = fontColor"
                class="text-[10px] transition-colors px-1.5 py-1 rounded hover:bg-nord-3 flex items-center gap-1"
                :class="svgColor === fontColor ? 'text-nord-8' : 'text-nord-4 hover:text-nord-6'"
                title="Set the logo color to the parameter text color"
              >
                <span
                  class="w-2.5 h-2.5 rounded-full border border-nord-3/40 shrink-0"
                  :style="{ backgroundColor: fontColor }"
                />
                {{ $t("border.useFontColor") }}
              </button>
              <ColorPicker
                :model-value="svgColor || '#000000'"
                @update:model-value="svgColor = $event"
              />
            </div>
          </div>
        </template>
      </div>

      <!-- Logo text (fallback) -->
      <div>
        <span class="text-xs text-nord-4 mb-1 block">{{ $t("border.logoText") }}</span>
        <input
          type="text"
          v-model="logoText"
          :placeholder="$t('border.logoTextPlaceholder')"
          class="w-full bg-nord-2 border border-nord-3 rounded-lg px-3 py-1.5 text-nord-6 text-xs focus:border-nord-8 focus:outline-none transition-colors placeholder:text-nord-6"
        />
      </div>
    </template>
  </div>
</template>
