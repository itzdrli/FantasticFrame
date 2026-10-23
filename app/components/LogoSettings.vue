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
const positionItems = computed(() => [
  { label: t("border.positionLeft"), value: "left" },
  { label: t("border.positionCenter"), value: "center" },
  { label: t("border.positionRight"), value: "right" },
]);
const positionModel = computed({
  get: () => logoPosition.value as string,
  set: (v: string) => (logoPosition.value = v as "left" | "center" | "right"),
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
  <div class="flex flex-col gap-2">
    <FieldRow :label="$t('border.position')">
      <div class="w-40"><SegmentedControl v-model="positionModel" :items="positionItems" /></div>
    </FieldRow>
    <p v-if="!showLogo" class="text-[10px] text-dimmed">{{ $t("border.logoHiddenHint") }}</p>

    <template v-if="showLogo">
      <div class="flex flex-col gap-2">
        <span class="text-[11px] text-muted">{{ $t("border.logoImage") }}</span>

        <div
          v-if="logoImageUrl"
          class="flex items-center gap-2 border border-default bg-muted p-1.5"
        >
          <img :src="logoImageUrl" class="h-8 max-w-30 object-contain" alt="" />
          <UButton
            :label="$t('border.remove')"
            color="error"
            variant="ghost"
            class="ml-auto"
            @click="clearLogoImage"
          />
        </div>
        <template v-else>
          <div class="grid grid-cols-2 gap-1.5">
            <UButton
              :label="$t('border.upload')"
              icon="i-lucide-image-up"
              color="neutral"
              variant="outline"
              block
              @click="logoImageInput?.click()"
            />
            <UButton
              :label="$t('border.pasteSvg')"
              icon="i-lucide-clipboard-paste"
              :color="showPasteSvg ? 'primary' : 'neutral'"
              variant="outline"
              block
              @click="showPasteSvg = !showPasteSvg"
            />
          </div>

          <div v-if="showPasteSvg" class="flex flex-col gap-1.5">
            <UTextarea
              v-model="svgInput"
              :placeholder="$t('border.svgPlaceholder')"
              :rows="5"
              variant="subtle"
              spellcheck="false"
              :ui="{ base: 'font-mono text-[11px] resize-y' }"
              @paste="onSvgPaste"
            />
            <div class="grid grid-cols-2 gap-1.5">
              <UButton :label="$t('border.apply')" block @click="applySvg" />
              <UButton
                :label="$t('border.cancel')"
                color="neutral"
                variant="subtle"
                block
                @click="cancelSvgPaste"
              />
            </div>
            <p v-if="svgError" class="text-[10px] text-error">{{ svgError }}</p>
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
            <UButton
              v-if="svgColor"
              :label="$t('border.reset')"
              color="neutral"
              variant="link"
              @click="svgColor = ''"
            />
            <UButton
              :label="$t('border.useFontColor')"
              color="neutral"
              variant="link"
              :class="svgColor === fontColor ? 'text-primary' : ''"
              @click="svgColor = fontColor"
            />
            <ColorPicker
              :model-value="svgColor || '#000000'"
              @update:model-value="svgColor = $event"
            />
          </FieldRow>
        </template>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] text-muted">{{ $t("border.logoText") }}</span>
        <UInput
          v-model="logoText"
          :placeholder="$t('border.logoTextPlaceholder')"
          variant="subtle"
        />
      </div>
    </template>
  </div>
</template>
