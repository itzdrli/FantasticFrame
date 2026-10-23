<script setup lang="ts">
import { ref } from "vue";
import { usePhotoImport } from "~/composables/usePhotoImport";

const { isImporting, importProgress, importPercent, skippedFiles, importFiles } = usePhotoImport();

const ACCEPT = ".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif";

// UFileUpload is a controlled field: hand the files to the importer, then clear it
const files = ref<File[] | null>(null);
function onFiles(value: File[] | null | undefined) {
  if (value?.length) void importFiles(value);
  files.value = null;
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div
      v-if="isImporting"
      class="flex min-h-40 flex-col justify-center gap-3 border border-default bg-default p-5"
    >
      <p class="font-medium text-highlighted">
        {{
          $t("uploader.importing", { current: importProgress.current, total: importProgress.total })
        }}
      </p>
      <UProgress :model-value="importPercent" size="xs" />
      <p class="text-[11px] text-muted">{{ $t("uploader.pleaseWait") }}</p>
    </div>

    <UFileUpload
      v-else
      v-model="files"
      multiple
      :accept="ACCEPT"
      :preview="false"
      icon="i-lucide-aperture"
      :label="$t('uploader.dragHint')"
      :description="$t('uploader.supports')"
      variant="area"
      color="neutral"
      class="w-full"
      :ui="{ base: 'min-h-40 rounded-[3px] border-dashed bg-default' }"
      @update:model-value="onFiles"
    />

    <UAlert
      v-if="skippedFiles.length"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :description="
        skippedFiles.length > 1
          ? $t('uploader.skippedPlural', {
              n: skippedFiles.length,
              reason: skippedFiles[0]?.reason,
            })
          : $t('uploader.skipped', { n: skippedFiles.length, reason: skippedFiles[0]?.reason })
      "
    />
  </div>
</template>
