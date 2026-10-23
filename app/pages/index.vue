<script setup lang="ts">
import { NButton, NCard, NIcon, NModal, NProgress, NTooltip, useMessage } from "naive-ui";
import { Download, ExternalLink, Frame, ShieldCheck } from "@lucide/vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { useImageRender } from "~/composables/useImageRender";
import { getResolvedConfig } from "~/composables/useTemplate";
import { useIsMobile } from "~/composables/useIsMobile";

useHead({
  title: "FantasticFrame",
  meta: [{ name: "description", content: "FantasticFrame - elegant photo borders and layouts." }],
});

const photoStore = usePhotoStore();
const { t } = useI18n();
const { renderImage, saveImage, batchExport, isRendering, error, batchProgress } = useImageRender();

const isMobile = useIsMobile();
/** Phone sheet: starts collapsed so a freshly opened photo is fully visible */
const panelCollapsed = ref(true);

const message = useMessage();
const showPrivacyModal = ref(false);

const isBatchExporting = ref(false);

// Export failures (single or batch) share the composable's error ref
watch(error, (msg) => {
  if (!msg) return;
  message.error(msg, { duration: 6000, closable: true });
  error.value = null;
});

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
  isBatchExporting.value = false;

  if (result.success > 0) {
    const partial = result.failed > 0;
    if (partial) {
      message.warning(t("app.exportPartial", { ok: result.success, fail: result.failed }), {
        duration: 5000,
      });
    } else {
      message.success(t("app.exportOk", { n: result.success }), { duration: 5000 });
    }
  }
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
  <div class="flex h-dvh w-full flex-col overflow-hidden bg-nord-0 text-nord-5">
    <header
      class="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-nord-3 bg-nord-1 px-3"
    >
      <div class="flex min-w-0 items-center gap-2">
        <NIcon :size="16" class="shrink-0 text-nord-8"><Frame /></NIcon>
        <span class="truncate text-[11px] font-semibold tracking-[0.16em] text-nord-6 uppercase">
          Fantastic Frame
        </span>
      </div>

      <div class="flex shrink-0 items-center gap-1.5">
        <AppearanceMenu />
        <span class="hidden sm:flex">
          <NTooltip :delay="500">
            <template #trigger>
              <NButton
                tag="a"
                href="https://github.com/itzdrli/FantasticFrame"
                target="_blank"
                rel="noopener noreferrer"
                quaternary
                size="tiny"
                aria-label="GitHub"
              >
                <template #icon>
                  <NIcon>
                    <!-- Lucide dropped brand marks; this is GitHub's own -->
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path
                        d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.5.2-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3"
                      />
                    </svg>
                  </NIcon>
                </template>
              </NButton>
            </template>
            GitHub
          </NTooltip>
        </span>

        <!-- Batch export: icon-only on phones, progress shown as a percentage -->
        <NButton
          size="tiny"
          :loading="isBatchExporting"
          :disabled="batchExportDisabled"
          :aria-label="$t('app.exportAll', { n: photoStore.photos.length })"
          @click="handleBatchExport"
        >
          <template v-if="!isBatchExporting" #icon>
            <NIcon><Download /></NIcon>
          </template>
          <span v-if="isMobile && isBatchExporting" class="tabular-nums">{{ batchPercent }}%</span>
          <template v-else-if="!isMobile">
            {{
              isBatchExporting
                ? $t("app.exporting", { pct: batchPercent })
                : $t("app.exportAll", { n: photoStore.photos.length })
            }}
          </template>
        </NButton>

        <NButton
          type="primary"
          size="tiny"
          :loading="isRendering && !isBatchExporting"
          :disabled="exportButtonDisabled"
          @click="handleExport"
        >
          {{ isRendering && !isBatchExporting ? $t("app.exportingSingle") : $t("app.export") }}
        </NButton>
      </div>
    </header>

    <NProgress
      v-if="isBatchExporting && batchProgress"
      type="line"
      :percentage="batchPercent"
      :show-indicator="false"
      :height="2"
      :border-radius="0"
    />

    <div class="flex min-h-0 flex-1 flex-col md:flex-row">
      <main class="flex min-h-0 min-w-0 flex-1 flex-col">
        <div class="relative min-h-0 flex-1 overflow-hidden">
          <!-- PreviewPanel is its own pan/zoom viewport: it fits the canvas to the
               measured size, so large photos never overflow -->
          <PreviewPanel v-if="photoStore.selectedPhoto" class="absolute inset-0" />
          <div v-else class="absolute inset-0 flex items-center justify-center p-4">
            <div class="flex w-full max-w-md flex-col gap-3">
              <div class="flex flex-col gap-1">
                <h2 class="text-sm font-semibold text-nord-6">{{ $t("app.emptyTitle") }}</h2>
                <p class="text-nord-4">{{ $t("app.emptyDesc") }}</p>
              </div>
              <PhotoUploader />
              <span class="self-start">
                <NButton text size="tiny" @click="showPrivacyModal = true">
                  <template #icon>
                    <NIcon><ShieldCheck /></NIcon>
                  </template>
                  {{ $t("app.privacyNotice") }}
                </NButton>
              </span>
            </div>
          </div>
        </div>

        <div
          class="flex h-20 shrink-0 items-center overflow-x-auto border-t border-nord-3 bg-nord-1 px-3 md:h-24"
        >
          <PhotoList />
        </div>
      </main>

      <aside
        v-if="photoStore.hasPhotos"
        class="shrink-0 border-t border-nord-3 bg-nord-1 max-md:pb-[env(safe-area-inset-bottom)] md:w-[300px] md:border-t-0 md:border-l"
        :class="isMobile && !panelCollapsed ? 'h-[42dvh]' : ''"
      >
        <SettingsPanel v-model:collapsed="panelCollapsed" :mobile="isMobile" />
      </aside>
    </div>

    <NModal v-model:show="showPrivacyModal">
      <NCard
        :title="$t('app.privacyModal.title')"
        closable
        role="dialog"
        aria-modal="true"
        class="mx-4 max-w-lg"
        @close="showPrivacyModal = false"
      >
        <div class="flex flex-col gap-3 text-[12px] leading-relaxed text-nord-5">
          <p class="text-nord-4">{{ $t("app.privacyModal.p1") }}</p>
          <p>{{ $t("app.privacyModal.p2") }}</p>
          <p>{{ $t("app.privacyModal.p3") }}</p>
        </div>
        <template #action>
          <div class="flex justify-end">
            <NButton
              tag="a"
              href="https://legal.itzdrli.cc"
              target="_blank"
              rel="noopener noreferrer"
              type="primary"
              size="small"
              icon-placement="right"
            >
              <template #icon>
                <NIcon><ExternalLink /></NIcon>
              </template>
              {{ $t("app.privacyModal.fullPolicy") }}
            </NButton>
          </div>
        </template>
      </NCard>
    </NModal>
  </div>
</template>
