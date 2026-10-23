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
const { t } = useI18n();
const { renderImage, saveImage, batchExport, isRendering, error, batchProgress } = useImageRender();

const isMobile = useIsMobile();
/** Phone sheet: starts collapsed so a freshly opened photo is fully visible */
const panelCollapsed = ref(true);

const toast = useToast();
const showPrivacyModal = ref(false);

const isBatchExporting = ref(false);

// Export failures (single or batch) share the composable's error ref
watch(error, (msg) => {
  if (!msg) return;
  toast.add({ title: msg, color: "error", icon: "i-lucide-triangle-alert", duration: 6000 });
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
    toast.add({
      title: partial
        ? t("app.exportPartial", { ok: result.success, fail: result.failed })
        : t("app.exportOk", { n: result.success }),
      color: partial ? "warning" : "success",
      icon: partial ? "i-lucide-triangle-alert" : "i-lucide-check",
      duration: 5000,
    });
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
  <div class="flex h-dvh w-full flex-col overflow-hidden bg-muted text-default">
    <header
      class="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-default bg-default px-3"
    >
      <div class="flex min-w-0 items-center gap-2">
        <UIcon name="i-lucide-frame" class="size-4 shrink-0 text-primary" />
        <span
          class="truncate text-[11px] font-semibold tracking-[0.16em] text-highlighted uppercase"
        >
          Fantastic Frame
        </span>
      </div>

      <div class="flex shrink-0 items-center gap-1.5">
        <AppearanceMenu />
        <UTooltip text="GitHub">
          <UButton
            to="https://github.com/itzdrli/FantasticFrame"
            target="_blank"
            rel="noopener noreferrer"
            icon="i-lucide-github"
            color="neutral"
            variant="ghost"
            class="hidden sm:inline-flex"
            aria-label="GitHub"
          />
        </UTooltip>

        <!-- Batch export: icon-only on phones, progress shown as a percentage -->
        <UButton
          :icon="isBatchExporting ? undefined : 'i-lucide-download'"
          :loading="isBatchExporting"
          :disabled="batchExportDisabled"
          color="neutral"
          variant="outline"
          :aria-label="$t('app.exportAll', { n: photoStore.photos.length })"
          @click="handleBatchExport"
        >
          <span v-if="isBatchExporting" class="tabular-nums md:hidden">{{ batchPercent }}%</span>
          <span class="hidden md:inline">
            {{
              isBatchExporting
                ? $t("app.exporting", { pct: batchPercent })
                : $t("app.exportAll", { n: photoStore.photos.length })
            }}
          </span>
        </UButton>

        <UButton
          :label="isRendering && !isBatchExporting ? $t('app.exportingSingle') : $t('app.export')"
          :loading="isRendering && !isBatchExporting"
          :disabled="exportButtonDisabled"
          @click="handleExport"
        />
      </div>
    </header>

    <UProgress v-if="isBatchExporting && batchProgress" :model-value="batchPercent" size="2xs" />

    <div class="flex min-h-0 flex-1 flex-col md:flex-row">
      <main class="flex min-h-0 min-w-0 flex-1 flex-col">
        <div class="relative min-h-0 flex-1 overflow-hidden">
          <!-- PreviewPanel is its own pan/zoom viewport: it fits the canvas to the
               measured size, so large photos never overflow -->
          <PreviewPanel v-if="photoStore.selectedPhoto" class="absolute inset-0" />
          <div v-else class="absolute inset-0 flex items-center justify-center p-4">
            <div class="flex w-full max-w-md flex-col gap-3">
              <div class="flex flex-col gap-1">
                <h2 class="text-sm font-semibold text-highlighted">{{ $t("app.emptyTitle") }}</h2>
                <p class="text-muted">{{ $t("app.emptyDesc") }}</p>
              </div>
              <PhotoUploader />
              <UButton
                :label="$t('app.privacyNotice')"
                icon="i-lucide-shield-check"
                color="neutral"
                variant="link"
                class="self-start px-0"
                @click="showPrivacyModal = true"
              />
            </div>
          </div>
        </div>

        <div
          class="flex h-20 shrink-0 items-center overflow-x-auto border-t border-default bg-default px-3 md:h-24"
        >
          <PhotoList />
        </div>
      </main>

      <aside
        v-if="photoStore.hasPhotos"
        class="shrink-0 border-t border-default bg-default max-md:pb-[env(safe-area-inset-bottom)] md:w-[300px] md:border-t-0 md:border-l"
        :class="isMobile && !panelCollapsed ? 'h-[42dvh]' : ''"
      >
        <SettingsPanel v-model:collapsed="panelCollapsed" :mobile="isMobile" />
      </aside>
    </div>

    <UModal
      v-model:open="showPrivacyModal"
      :title="$t('app.privacyModal.title')"
      :description="$t('app.privacyModal.p1')"
      :ui="{ content: 'max-w-lg' }"
    >
      <template #body>
        <div class="flex flex-col gap-3 text-[12px] leading-relaxed text-toned">
          <p>{{ $t("app.privacyModal.p2") }}</p>
          <p>{{ $t("app.privacyModal.p3") }}</p>
        </div>
      </template>
      <template #footer>
        <UButton
          :label="$t('app.privacyModal.fullPolicy')"
          to="https://legal.itzdrli.cc"
          target="_blank"
          rel="noopener noreferrer"
          trailing-icon="i-lucide-external-link"
        />
      </template>
    </UModal>
  </div>
</template>
