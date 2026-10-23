<script setup lang="ts">
import { NAlert, NIcon, NProgress, NUpload, NUploadDragger, type UploadFileInfo } from "naive-ui";
import { Aperture } from "@lucide/vue";
import { usePhotoImport } from "~/composables/usePhotoImport";

const { isImporting, importProgress, importPercent, skippedFiles, importFiles } = usePhotoImport();

const ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif";

// NUpload hands over one file per callback; gather a drop/pick into a single
// batch so the importer sees it whole (one progress run, one skip list).
// Returning false keeps Naive from uploading or listing anything itself.
let pending: File[] = [];
function onBeforeUpload({ file }: { file: UploadFileInfo }) {
  if (file.file) {
    if (pending.length === 0) {
      setTimeout(() => {
        const batch = pending;
        pending = [];
        void importFiles(batch);
      });
    }
    pending.push(file.file);
  }
  return false;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-if="isImporting"
      class="flex min-h-40 flex-col justify-center gap-3 border border-nord-3 bg-nord-1 p-5"
    >
      <p class="font-medium text-nord-6">
        {{
          $t("uploader.importing", { current: importProgress.current, total: importProgress.total })
        }}
      </p>
      <NProgress type="line" :percentage="importPercent" :show-indicator="false" :height="4" />
      <p class="text-[11px] text-nord-4">{{ $t("uploader.pleaseWait") }}</p>
    </div>

    <NUpload
      v-else
      multiple
      :accept="ACCEPT"
      :show-file-list="false"
      :default-upload="false"
      @before-upload="onBeforeUpload"
    >
      <NUploadDragger>
        <div class="flex min-h-32 flex-col items-center justify-center gap-2">
          <NIcon :size="28" class="text-nord-4"><Aperture /></NIcon>
          <p class="font-medium text-nord-6">{{ $t("uploader.dragHint") }}</p>
          <p class="text-[11px] text-nord-4">{{ $t("uploader.supports") }}</p>
        </div>
      </NUploadDragger>
    </NUpload>

    <NAlert v-if="skippedFiles.length" type="error" :bordered="false">
      {{
        skippedFiles.length > 1
          ? $t("uploader.skippedPlural", {
              n: skippedFiles.length,
              reason: skippedFiles[0]?.reason,
            })
          : $t("uploader.skipped", { n: skippedFiles.length, reason: skippedFiles[0]?.reason })
      }}
    </NAlert>
  </div>
</template>
