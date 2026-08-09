<script setup lang="ts">
import { usePhotoStore } from "~/composables/usePhotoStore";
import { useImageRender } from "~/composables/useImageRender";
import { useTemplate } from "~/composables/useTemplate";

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
const { getResolvedConfig } = useTemplate();

// Drawers stay hidden until the first photo is uploaded
const showSettings = ref(false);
const showExif = ref(false);

watch(
  () => photoStore.hasPhotos,
  (hasPhotos) => {
    if (hasPhotos) {
      showSettings.value = true;
      showExif.value = true;
    }
  },
);

// ── Privacy modal ───────────────────────────────────────────────────────────
const showPrivacyModal = ref(false);

// ── Batch export state ──────────────────────────────────────────────────────
const isBatchExporting = ref(false);
const batchResult = ref<{ success: number; failed: number } | null>(null);
const showBatchResultToast = ref(false);
let batchToastTimer: ReturnType<typeof setTimeout> | null = null;

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
    photoBase64: photo.dataUrl,
    exifData: photo.exif,
    templateConfig,
    photoWidth: photo.width,
    photoHeight: photo.height,
    crop: photo.crop,
  });
  if (res?.imageBase64) {
    await saveImage(res.imageBase64, photo.fileName);
  }
}

// ── Batch export ────────────────────────────────────────────────────────────
async function handleBatchExport() {
  if (photoStore.photos.length === 0) return;

  isBatchExporting.value = true;
  batchResult.value = null;
  showBatchResultToast.value = false;

  const items = photoStore.photos.map((photo) => ({
    payload: {
      photoBase64: photo.dataUrl,
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
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-nord-0 text-nord-4">
    <!-- Top Nav -->
    <header
      class="h-16 shrink-0 flex items-center justify-between px-6 bg-nord-1 border-b-2 border-nord-3"
    >
      <div class="flex items-center gap-3">
        <div class="text-xl font-semibold text-nord-6 tracking-tight">Fantastic Frame</div>
        <button
          @click="showSettings = !showSettings"
          class="px-3 py-1.5 text-xs rounded shadow transition-colors flex items-center gap-1.5"
          :class="
            showSettings
              ? 'bg-nord-8 text-nord-0 font-medium'
              : 'bg-nord-2 text-nord-4 hover:bg-nord-3'
          "
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Settings
        </button>
        <button
          @click="showExif = !showExif"
          class="px-3 py-1.5 text-xs rounded shadow transition-colors flex items-center gap-1.5"
          :class="
            showExif ? 'bg-nord-8 text-nord-0 font-medium' : 'bg-nord-2 text-nord-4 hover:bg-nord-3'
          "
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 17h6m-6-4h6m-6-4h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
            />
          </svg>
          EXIF
        </button>
      </div>

      <!-- Top-right export area -->
      <div class="flex items-center gap-2">
        <!-- GitHub repo link -->
        <a
          href="https://github.com/itzdrli/FantasticFrame"
          target="_blank"
          rel="noopener noreferrer"
          class="p-2 bg-nord-2 text-nord-4 rounded shadow hover:bg-nord-3 hover:text-nord-6 transition-colors flex items-center justify-center"
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

        <!-- Batch export button -->
        <button
          @click="handleBatchExport"
          :disabled="batchExportDisabled"
          class="px-4 py-2 bg-nord-3 text-nord-6 font-medium rounded shadow hover:bg-nord-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
          :title="`Batch export all ${photoStore.photos.length} photos`"
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
          <span v-if="!isBatchExporting">Export All ({{ photoStore.photos.length }})</span>
          <span v-else>Exporting {{ batchPercent }}%</span>
        </button>

        <!-- Single export button -->
        <button
          @click="handleExport"
          :disabled="exportButtonDisabled"
          class="px-4 py-2 bg-nord-8 text-nord-0 font-medium rounded shadow hover:bg-nord-9 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isRendering && !isBatchExporting">Exporting...</span>
          <span v-else>Export</span>
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

    <!-- Batch export result toast -->
    <Transition name="toast">
      <div
        v-if="showBatchResultToast && batchResult"
        class="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 border"
        :class="
          batchResult.failed === 0
            ? 'bg-nord-14/10 border-nord-14/30 text-nord-14'
            : 'bg-nord-11/10 border-nord-11/30 text-nord-11'
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
          All {{ batchResult.success }} exported successfully
        </span>
        <span v-else> {{ batchResult.success }} succeeded / {{ batchResult.failed }} failed </span>
      </div>
    </Transition>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: Preview & Photo Strip -->
      <main class="flex-1 flex flex-col relative overflow-hidden bg-nord-0">
        <!-- Preview Area -->
        <div
          class="flex-1 relative overflow-auto flex items-center justify-center p-8 bg-[repeating-conic-gradient(#3B4252_0_25%,#2E3440_0_50%)] bg-[length:24px_24px]"
        >
          <div
            v-if="photoStore.selectedPhoto"
            class="max-w-full max-h-full flex items-center justify-center"
          >
            <PreviewPanel />
          </div>
          <div
            v-else
            class="flex flex-col items-center justify-center max-w-md w-full bg-nord-1/80 backdrop-blur rounded-xl p-8 border border-nord-2 shadow-lg"
          >
            <h2 class="text-xl text-nord-6 font-semibold mb-4 text-center">Get Started</h2>
            <p class="text-nord-4 text-center mb-6">
              Upload photos to begin creating your fantastic frames.
            </p>
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
              Privacy Notice
            </button>
          </div>
        </div>

        <!-- Photo Strip Bottom -->
        <div
          class="h-32 shrink-0 border-t-2 border-nord-3 bg-nord-1 flex items-center px-4 overflow-x-auto"
        >
          <PhotoList />
        </div>
      </main>

      <!-- Left: EXIF Floating Drawer -->
      <Transition name="exif-drawer">
        <aside
          v-if="showExif"
          class="fixed top-16 left-0 z-40 w-[380px] max-h-[calc(100vh-4rem)] bg-nord-1 border-r-2 border-b-2 border-nord-3 shadow-2xl flex flex-col rounded-br-xl overflow-hidden"
        >
          <div class="p-4 flex items-center justify-between border-b border-nord-2 shrink-0">
            <span class="text-sm font-semibold text-nord-6">EXIF Info</span>
            <button
              @click="showExif = false"
              class="w-7 h-7 flex items-center justify-center rounded hover:bg-nord-3 text-nord-4 hover:text-nord-6 transition-colors"
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
          <div class="overflow-y-auto p-4">
            <ExifPanel />
          </div>
        </aside>
      </Transition>

      <!-- Right: Settings Floating Drawer -->
      <Transition name="settings-drawer">
        <aside
          v-if="showSettings"
          class="fixed top-16 right-0 bottom-0 w-[400px] z-40 bg-nord-1 border-l-2 border-nord-3 shadow-2xl flex flex-col"
        >
          <div class="p-4 flex items-center justify-between border-b border-nord-2 shrink-0">
            <span class="text-sm font-semibold text-nord-6">Settings</span>
            <button
              @click="showSettings = false"
              class="w-7 h-7 flex items-center justify-center rounded hover:bg-nord-3 text-nord-4 hover:text-nord-6 transition-colors"
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
          <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            <section>
              <h3 class="text-sm font-semibold text-nord-6 uppercase tracking-wider mb-3">
                Template
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
                Typography
              </h3>
              <TypeSettings />
            </section>

            <hr class="border-nord-2" />

            <!-- Export Section -->
            <section>
              <h3 class="text-sm font-semibold text-nord-6 uppercase tracking-wider mb-3">
                Export
              </h3>
              <div class="flex flex-col gap-3 text-sm text-nord-4">
                <!-- Format -->
                <div class="flex items-center justify-between">
                  <span class="text-xs text-nord-4">Format</span>
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

                <!-- Quality -->
                <div v-if="exportFormat !== 'png'">
                  <span class="text-xs text-nord-4 mb-1 block">Quality {{ exportQuality }}%</span>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    v-model.number="exportQuality"
                    class="w-full accent-nord-8"
                  />
                </div>
                <p v-if="exportFormat === 'png'" class="text-[10px] text-nord-4/70">
                  PNG is lossless, no quality setting needed
                </p>
                <p v-else-if="exportFormat === 'webp'" class="text-[10px] text-nord-4/70">
                  Browser-side WebP is lossless; the quality slider only applies to the server
                  render
                </p>
                <p v-else class="text-[10px] text-nord-4/70">
                  JPEG is lossy; higher quality means larger files
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
            <h3 class="text-lg font-semibold text-nord-6">Privacy Notice</h3>
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
            <p>
              By default, your photos are processed entirely in your browser. Single export is
              rendered locally via WASM and never leaves your device.
            </p>
            <p>
              Batch export sends photos to our server for rendering. They are kept only in server
              memory, never written to disk, never stored in a database. Tasks auto-expire after 10
              minutes and memory is released immediately after download.
            </p>
            <p>
              We do not collect accounts, cookies, ads, or any tracking data. No copies of your
              photos are retained. Server location: Germany, EU (GDPR).
            </p>
          </div>

          <div class="flex justify-end">
            <a
              href="https://legal.itzdrli.cc"
              target="_blank"
              rel="noopener noreferrer"
              class="px-4 py-2 bg-nord-8 text-nord-0 font-medium rounded shadow hover:bg-nord-9 transition-colors text-sm"
            >
              View Full Policy
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
