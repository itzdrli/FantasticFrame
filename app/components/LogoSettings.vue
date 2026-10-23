<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NButton, NIcon, NInput, NSwitch, useMessage } from "naive-ui";
import { ClipboardPaste, ImageUp } from "@lucide/vue";
import {
  applySvgColor,
  decodeSvgDataUrl,
  encodeSvgDataUrl,
  extractSvgAspect,
} from "~/utils/svgLogo";
import { loadLibraryLogo } from "~/composables/useLogoLibrary";
import { LOGO_LIBRARY, matchLogoId } from "~~/shared/logos";
import { usePhotoStore } from "~/composables/usePhotoStore";

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
const positionItems = computed(() => [
  { label: t("border.positionLeft"), value: "left" },
  { label: t("border.positionCenter"), value: "center" },
  { label: t("border.positionRight"), value: "right" },
]);
const positionModel = computed({
  get: () => logoPosition.value as string,
  set: (v: string) => (logoPosition.value = v as "left" | "center" | "right"),
});
const photoStore = usePhotoStore();
const message = useMessage();

const logoAuto = computed({
  get: () => overrides.value.logoAuto ?? resolvedConfig.value?.logoAuto ?? false,
  set: (v) => update("logoAuto", v),
});
/** What auto mode does for the selected photo, shown under the switch */
const autoStatus = computed(() => {
  if (logoImageUrl.value) return t("border.logoAutoOverridden");
  if (logoText.value) return t("border.logoAutoTextWins");
  const exif = photoStore.selectedPhoto?.exif;
  const id = matchLogoId(exif?.make, exif?.model);
  const name = LOGO_LIBRARY.find((l) => l.id === id)?.name;
  return name ? t("border.logoAutoHit", { name }) : t("border.logoAutoMiss");
});

// A library logo is a pasted SVG that starts out in the caption colour, so it
// reads on dark templates too; "Reset" brings back the original colours.
async function pickLibraryLogo(id: string) {
  try {
    const svg = await loadLibraryLogo(id);
    loadSvg(svg);
    svgColor.value = fontColor.value;
  } catch {
    message.error(t("border.logoLoadFailed"));
  }
}

const isSplit = computed(
  () => (overrides.value.captionStyle ?? resolvedConfig.value?.captionStyle) === "split",
);
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
  <div class="flex flex-col gap-2">
    <p v-if="isSplit" class="text-[12px] text-nord-4/60">{{ $t("border.logoSplitHint") }}</p>
    <FieldRow v-else :label="$t('border.position')">
      <div class="w-48"><SegmentedControl v-model="positionModel" :items="positionItems" /></div>
    </FieldRow>
    <p v-if="!showLogo" class="text-[12px] text-nord-4/60">{{ $t("border.logoHiddenHint") }}</p>

    <template v-if="showLogo">
      <div class="flex flex-col gap-2">
        <FieldRow :label="$t('border.logoAuto')">
          <NSwitch v-model:value="logoAuto" size="small" :aria-label="$t('border.logoAuto')" />
        </FieldRow>
        <p v-if="logoAuto" class="-mt-1 text-[12px] leading-snug text-nord-4/60">
          {{ autoStatus }}
        </p>
        <span class="text-[13px] text-nord-4">{{ $t("border.logoImage") }}</span>

        <div
          v-if="logoImageUrl"
          class="flex items-center gap-2 border border-nord-3 bg-nord-0 p-1.5"
        >
          <img :src="logoImageUrl" class="h-8 max-w-30 object-contain" alt="" />
          <span class="ml-auto">
            <NButton size="tiny" type="error" quaternary @click="clearLogoImage">
              {{ $t("border.remove") }}
            </NButton>
          </span>
        </div>
        <template v-else>
          <div class="grid grid-cols-3 gap-1.5">
            <LogoLibraryPicker @pick="pickLibraryLogo" />
            <NButton size="tiny" block @click="logoImageInput?.click()">
              <template #icon>
                <NIcon><ImageUp /></NIcon>
              </template>
              {{ $t("border.upload") }}
            </NButton>
            <NButton
              size="tiny"
              block
              :type="showPasteSvg ? 'primary' : 'default'"
              :ghost="showPasteSvg"
              @click="showPasteSvg = !showPasteSvg"
            >
              <template #icon>
                <NIcon><ClipboardPaste /></NIcon>
              </template>
              {{ $t("border.pasteSvg") }}
            </NButton>
          </div>

          <div v-if="showPasteSvg" class="flex flex-col gap-1.5">
            <NInput
              v-model:value="svgInput"
              type="textarea"
              :placeholder="$t('border.svgPlaceholder')"
              :rows="5"
              size="tiny"
              :input-props="{ spellcheck: false, style: { fontFamily: 'var(--font-mono)' } }"
              @paste="onSvgPaste"
            />
            <div class="grid grid-cols-2 gap-1.5">
              <NButton size="tiny" type="primary" block @click="applySvg">
                {{ $t("border.apply") }}
              </NButton>
              <NButton size="tiny" secondary block @click="cancelSvgPaste">
                {{ $t("border.cancel") }}
              </NButton>
            </div>
            <p v-if="svgError" class="text-[12px] text-nord-11">{{ svgError }}</p>
          </div>
        </template>
        <input
          ref="logoImageInput"
          type="file"
          accept="image/*,.svg"
          class="hidden"
          @change="onLogoImageChange"
        />

        <template v-if="logoImageUrl">
          <ParamSlider
            v-model="logoScale"
            :label="$t('border.scale')"
            :min="20"
            :max="300"
            suffix="%"
            :default-value="100"
          />

          <!-- SVG colour override (SVG logos only) -->
          <FieldRow v-if="isSvgLogo" :label="$t('border.svgColor')">
            <NButton v-if="svgColor" text size="tiny" @click="svgColor = ''">
              {{ $t("border.reset") }}
            </NButton>
            <NButton
              text
              size="tiny"
              :type="svgColor === fontColor ? 'primary' : 'default'"
              @click="svgColor = fontColor"
            >
              {{ $t("border.useFontColor") }}
            </NButton>
            <ColorPicker
              :model-value="svgColor || '#000000'"
              @update:model-value="svgColor = $event"
            />
          </FieldRow>
        </template>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[13px] text-nord-4">{{ $t("border.logoText") }}</span>
        <NInput
          v-model:value="logoText"
          :placeholder="$t('border.logoTextPlaceholder')"
          size="tiny"
        />
      </div>
    </template>
  </div>
</template>
