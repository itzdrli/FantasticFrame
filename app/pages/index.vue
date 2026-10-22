<script setup lang="ts">
import { usePhotoStore } from "~/composables/usePhotoStore";
import { useImageRender } from "~/composables/useImageRender";
import { getResolvedConfig } from "~/composables/useTemplate";
import { useIsMobile } from "~/composables/useIsMobile";

useHead({
  title: "FantasticFrame",
  meta: [{ name: "description", content: "FantasticFrame - elegant photo borders and layouts." }],
});

const photoStore = usePhotoStore();
const {
  renderImage,
  saveImage,
  batchExport,
  isRendering,
  error,
  exportFormat,
  exportQuality,
  batchProgress,
} = useImageRender();

// Drawers stay hidden until the first photo is uploaded. On phones they are
// bottom sheets that share the screen with the preview, so only one is open at
// a time and neither opens by itself (it would hide the photo being edited).
const showSettings = ref(false);
const showExif = ref(false);
const isMobile = useIsMobile();

watch(
  () => photoStore.hasPhotos,
  (hasPhotos) => {
    if (!hasPhotos) return;
    showSettings.value = !isMobile.value;
    showExif.value = !isMobile.value;
  },
);
watch(showSettings, (open) => {
  if (open && isMobile.value) showExif.value = false;
});
watch(showExif, (open) => {
  if (open && isMobile.value) showSettings.value = false;
});

// ── Privacy modal ───────────────────────────────────────────────────────────
const showPrivacyModal = ref(false);

// ── Batch export state ──────────────────────────────────────────────────────
const isBatchExporting = ref(false);
const batchResult = ref<{ success: number; failed: number } | null>(null);
const showBatchResultToast = ref(false);
let batchToastTimer: ReturnType<typeof setTimeout> | null = null;
let errorToastTimer: ReturnType<typeof setTimeout> | null = null;

// Export failures (single or batch) were previously silent — error was set in
// the composable but never rendered. Auto-dismiss after a few seconds.
watch(error, (msg) => {
  if (errorToastTimer) clearTimeout(errorToastTimer);
  if (msg) {
    errorToastTimer = setTimeout(() => (error.value = null), 6000);
  }
});

onUnmounted(() => {
  if (batchToastTimer) clearTimeout(batchToastTimer);
  if (errorToastTimer) clearTimeout(errorToastTimer);
});

const exportFormats: { label: string; value: "png" | "jpeg" | "webp" }[] = [
  { label: "PNG", value: "png" },
  { label: "JPEG", value: "jpeg" },
  { label: "WebP", value: "webp" },
];

// ── Single export ───────────────────────────────────────────────────────────
async function handleExport() {
  const photo = photoStore.selectedPhoto;
  if (!photo) return;
  const templateConfig = getResolvedConfig(photo.templateId, photo.templateOverrides);
  const res = await renderImage({
    photo: photo.file,
    exifData: photo.exif,
    templateConfig,
    photoWidth: photo.width,
    photoHeight: photo.height,
    crop: photo.crop,
  });
  if (res) saveImage(res.bytes, res.mimeType, photo.fileName);
}

// ── Batch export ────────────────────────────────────────────────────────────
async function handleBatchExport() {
  if (photoStore.photos.length === 0) return;

  isBatchExporting.value = true;
  batchResult.value = null;
  showBatchResultToast.value = false;

  const items = photoStore.photos.map((photo) => ({
    input: {
      photo: photo.file,
      exifData: photo.exif,
      templateConfig: getResolvedConfig(photo.templateId, photo.templateOverrides),
      photoWidth: photo.width,
      photoHeight: photo.height,
      crop: photo.crop,
    },
    originalFilename: photo.fileName,
  }));

  const result = await batchExport(items);
  batchResult.value = result;
  isBatchExporting.value = false;

  // Show result toast
  showBatchResultToast.value = true;
  if (batchToastTimer) clearTimeout(batchToastTimer);
  batchToastTimer = setTimeout(() => {
    showBatchResultToast.value = false;
  }, 5000);
}

// Batch progress percentage
const batchPercent = computed(() => {
  const p = batchProgress.value;
  if (!p || p.total === 0) return 0;
  return Math.round((p.current / p.total) * 100);
});

const exportButtonDisabled = computed(
  () => isRendering.value || !photoStore.selectedPhoto || isBatchExporting.value,
);

const batchExportDisabled = computed(
  () => isRendering.value || photoStore.photos.length === 0 || isBatchExporting.value,
);
</script>

<template>
  <div class="h-dvh w-full flex flex-col overflow-hidden bg-nord-0 text-nord-4">
    <!-- Top Nav -->
    <header
      class="h-12 md:h-16 shrink-0 flex items-center justify-between gap-2 px-3 md:px-6 bg-nord-1 border-b-2 border-nord-3"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div class="text-base md:text-xl font-semibold text-nord-6 tracking-tight truncate">
          Fantastic Frame
        </div>
        <PanelTabs v-model:settings="showSettings" v-model:exif="showExif" class="hidden md:flex" />
      </div>

      <!-- Top-right export area -->
      <div class="flex items-center gap-2 shrink-0">
        <!-- Appearance: theme + language (app-level prefs, not per-photo) -->
        <AppearanceMenu />

        <!-- GitHub repo link -->
        <a
          href="https://github.com/itzdrli/FantasticFrame"
          target="_blank"
          rel="noopener noreferrer"
          class="hidden sm:flex p-2 bg-nord-2 text-nord-4 rounded shadow hover:bg-nord-3 hover:text-nord-6 transition-colors items-center justify-center"
          title="View on GitHub"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.565 4.943.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
        </a>

        <!-- Batch export button (icon-only on phones; the count/progress is in the title) -->
        <button
          @click="handleBatchExport"
          :disabled="batchExportDisabled"
          class="px-2.5 md:px-4 py-2 bg-nord-3 text-nord-6 font-medium rounded shadow hover:bg-nord-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
          :title="$t('app.exportAll', { n: photoStore.photos.length })"
          :aria-label="$t('app.exportAll', { n: photoStore.photos.length })"
        >
          <svg
            v-if="!isBatchExporting"
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span v-if="isBatchExporting" class="md:hidden tabular-nums">{{ batchPercent }}%</span>
          <span class="hidden md:inline">
            {{
              isBatchExporting
                ? $t("app.exporting", { pct: batchPercent })
                : $t("app.exportAll", { n: photoStore.photos.length })
            }}
          </span>
        </button>

        <!-- Single export button -->
        <button
          @click="handleExport"
          :disabled="exportButtonDisabled"
          class="px-3 md:px-4 py-2 bg-nord-8 text-nord-0 font-medium rounded shadow hover:bg-nord-9 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          <span v-if="isRendering && !isBatchExporting">{{ $t("app.exportingSingle") }}</span>
          <span v-else>{{ $t("app.export") }}</span>
        </button>
      </div>
    </header>

    <!-- Batch export progress bar -->
    <Transition name="slide-down">
      <div v-if="isBatchExporting && batchProgress" class="h-1 bg-nord-1 shrink-0">
        <div
          class="h-full bg-nord-8 transition-all duration-300"
          :style="{ width: `${batchPercent}%` }"
        />
      </div>
    </Transition>

    <!-- Export error toast (single + batch share the composable error ref) -->
    <Transition name="toast">
      <div
        v-if="error"
        class="fixed top-14 md:top-32 left-3 right-3 md:left-auto md:right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 border bg-nord-2 border-nord-11/60 text-nord-11"
        role="alert"
      >
        <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
        <span class="md:max-w-xs min-w-0 break-words">{{ error }}</span>
        <button
          @click="error = null"
          class="ml-1 w-6 h-6 shrink-0 flex items-center justify-center rounded hover:bg-nord-11/20 transition-colors"
          aria-label="Dismiss"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- Batch export result toast -->
    <Transition name="toast">
      <div
        v-if="showBatchResultToast && batchResult"
        class="fixed top-14 md:top-20 left-3 right-3 md:left-auto md:right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 border"
        :class="
          batchResult.failed === 0
            ? 'bg-nord-2 border-nord-14/60 text-nord-14'
            : 'bg-nord-2 border-nord-11/60 text-nord-11'
        "
      >
        <svg
          v-if="batchResult.failed === 0"
          class="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <svg v-else class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
        <span v-if="batchResult.failed === 0">
          {{ $t("app.exportOk", { n: batchResult.success }) }}
        </span>
        <span v-else>
          {{ $t("app.exportPartial", { ok: batchResult.success, fail: batchResult.failed }) }}
        </span>
      </div>
    </Transition>

    <!-- Main Content -->
    <div class="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
      <!-- Left: Preview & Photo Strip -->
      <main class="flex-1 min-h-0 flex flex-col relative overflow-hidden bg-nord-0">
        <!-- Preview Area -->
        <div
          class="flex-1 min-h-0 relative overflow-hidden flex items-center justify-center p-3 md:p-8 bg-[repeating-conic-gradient(var(--color-nord-1)_0_25%,var(--color-nord-0)_0_50%)] bg-[length:24px_24px]"
        >
          <!-- PreviewPanel is its own pan/zoom viewport: it fills the area and
               fits the canvas to the measured size, so large photos never overflow -->
          <div v-if="photoStore.selectedPhoto" class="absolute inset-0">
            <PreviewPanel />
          </div>
          <div
            v-else
            class="flex flex-col items-center justify-center max-w-md w-full bg-nord-1/80 backdrop-blur rounded-xl p-8 border border-nord-2 shadow-lg"
          >
            <h2 class="text-xl text-nord-6 font-semibold mb-4 text-center">
              {{ $t("app.emptyTitle") }}
            </h2>
            <p class="text-nord-4 text-center mb-6">{{ $t("app.emptyDesc") }}</p>
            <PhotoUploader />
            <button
              @click="showPrivacyModal = true"
              class="mt-6 px-3 py-1.5 text-xs rounded shadow transition-colors flex items-center gap-1.5 bg-nord-2 text-nord-4 hover:bg-nord-3 hover:text-nord-6"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {{ $t("app.privacyNotice") }}
            </button>
          </div>
        </div>

        <!-- Phone-only panel switcher: sits between the preview and the sheet -->
        <PanelTabs
          v-if="photoStore.hasPhotos"
          v-model:settings="showSettings"
          v-model:exif="showExif"
          class="md:hidden shrink-0 justify-center py-1.5 bg-nord-1 border-t-2 border-nord-3"
        />

        <!-- Photo Strip Bottom -->
        <div
          class="h-24 md:h-32 shrink-0 border-t-2 border-nord-3 bg-nord-1 flex items-center px-3 md:px-4 overflow-x-auto"
        >
          <PhotoList />
        </div>
      </main>

      <!-- Left: EXIF Floating Drawer -->
      <Transition name="exif-drawer">
        <aside
          v-if="showExif"
          class="sheet shrink-0 h-[42dvh] w-full border-t-2 md:h-auto md:fixed md:top-16 md:left-0 md:z-40 md:w-[380px] md:max-h-[calc(100dvh-4rem)] bg-nord-1 border-nord-3 md:border-t-0 md:border-r-2 md:border-b-2 md:shadow-2xl flex flex-col md:rounded-br-xl overflow-y-auto md:overflow-hidden"
        >
          <div
            class="px-4 py-2 md:py-4 flex items-center justify-between border-b border-nord-2 shrink-0 sticky top-0 z-10 bg-nord-1 md:static"
          >
            <span class="text-sm font-semibold text-nord-6">{{ $t("app.exifInfo") }}</span>
            <button
              @click="showExif = false"
              class="w-9 h-9 md:w-7 md:h-7 flex items-center justify-center rounded hover:bg-nord-3 text-nord-4 hover:text-nord-6 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div class="md:overflow-y-auto p-4">
            <ExifPanel />
          </div>
        </aside>
      </Transition>

      <!-- Right: Settings Floating Drawer -->
      <Transition name="settings-drawer">
        <aside
          v-if="showSettings"
          class="sheet shrink-0 h-[42dvh] w-full border-t-2 md:h-auto md:fixed md:top-16 md:right-0 md:bottom-0 md:w-[400px] md:z-40 bg-nord-1 border-nord-3 md:border-t-0 md:border-l-2 md:shadow-2xl flex flex-col overflow-y-auto md:overflow-visible"
        >
          <div
            class="px-4 py-2 md:py-4 flex items-center justify-between border-b border-nord-2 shrink-0 sticky top-0 z-10 bg-nord-1 md:static"
          >
            <span class="text-sm font-semibold text-nord-6">{{ $t("app.settings") }}</span>
            <button
              @click="showSettings = false"
              class="w-9 h-9 md:w-7 md:h-7 flex items-center justify-center rounded hover:bg-nord-3 text-nord-4 hover:text-nord-6 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <StyleSyncBar v-if="photoStore.count > 1" />
          <div class="md:flex-1 md:overflow-y-auto p-4 flex flex-col gap-6">
            <section>
              <h3 class="text-sm font-semibold text-nord-6 uppercase tracking-wider mb-3">
                {{ $t("template.sectionTitle") }}
              </h3>
              <TemplateSelector />
            </section>

            <hr class="border-nord-2" />

            <section>
              <BorderSettings />
            </section>

            <hr class="border-nord-2" />

            <section>
              <h3 class="text-sm font-semibold text-nord-6 uppercase tracking-wider mb-3">
                {{ $t("typography.sectionTitle") }}
              </h3>
              <TypeSettings />
            </section>

            <hr class="border-nord-2" />

            <!-- Export Section -->
            <section>
              <h3 class="text-sm font-semibold text-nord-6 uppercase tracking-wider mb-3">
                {{ $t("export.sectionTitle") }}
              </h3>
              <div class="flex flex-col gap-3 text-sm text-nord-4">
                <!-- Format -->
                <div class="flex items-center justify-between">
                  <span class="text-xs text-nord-4">{{ $t("export.format") }}</span>
                  <div class="flex rounded-lg overflow-hidden border border-nord-3">
                    <button
                      v-for="f in exportFormats"
                      :key="f.value"
                      @click="exportFormat = f.value"
                      class="px-3 py-1 text-xs transition-colors"
                      :class="
                        exportFormat === f.value
                          ? 'bg-nord-8 text-nord-0 font-medium'
                          : 'bg-nord-2 text-nord-4 hover:bg-nord-3'
                      "
                    >
                      {{ f.label }}
                    </button>
                  </div>
                </div>

                <SliderField
                  v-if="exportFormat !== 'png'"
                  v-model="exportQuality"
                  :label="$t('export.quality')"
                  :min="50"
                  :max="100"
                  suffix="%"
                />
                <p v-if="exportFormat === 'png'" class="text-[10px] text-nord-4/70">
                  {{ $t("export.pngLossless") }}
                </p>
                <p v-else-if="exportFormat === 'webp'" class="text-[10px] text-nord-4/70">
                  {{ $t("export.webpHint") }}
                </p>
                <p v-else class="text-[10px] text-nord-4/70">
                  {{ $t("export.jpegHint") }}
                </p>
              </div>
            </section>
          </div>
        </aside>
      </Transition>
    </div>

    <!-- Privacy Modal -->
    <Transition name="modal">
      <div
        v-if="showPrivacyModal"
        @click.self="showPrivacyModal = false"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <div
          class="modal-dialog max-w-lg w-full bg-nord-1 border border-nord-3 rounded-xl shadow-2xl p-6 flex flex-col gap-4"
        >
          <div class="flex items-start justify-between gap-4">
            <h3 class="text-lg font-semibold text-nord-6">{{ $t("app.privacyModal.title") }}</h3>
            <button
              @click="showPrivacyModal = false"
              class="w-7 h-7 flex items-center justify-center rounded hover:bg-nord-3 text-nord-4 hover:text-nord-6 transition-colors shrink-0"
              aria-label="Close"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div class="text-sm text-nord-4 flex flex-col gap-3">
            <p>{{ $t("app.privacyModal.p1") }}</p>
            <p>{{ $t("app.privacyModal.p2") }}</p>
            <p>{{ $t("app.privacyModal.p3") }}</p>
          </div>

          <div class="flex justify-end">
            <a
              href="https://legal.itzdrli.cc"
              target="_blank"
              rel="noopener noreferrer"
              class="px-4 py-2 bg-nord-8 text-nord-0 font-medium rounded shadow hover:bg-nord-9 transition-colors text-sm"
            >
              {{ $t("app.privacyModal.fullPolicy") }}
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
