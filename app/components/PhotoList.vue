<script setup lang="ts">
import { ref } from "vue";
import { NButton, NIcon, NTag, NTooltip } from "naive-ui";
import { Plus, X } from "@lucide/vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { usePhotoImport } from "~/composables/usePhotoImport";

const photoStore = usePhotoStore();
const { isImporting, importProgress, skippedFiles, importFiles } = usePhotoImport();

const fileInput = ref<HTMLInputElement | null>(null);

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files) {
    void importFiles(target.files);
    target.value = "";
  }
}
</script>

<template>
  <div class="flex h-full w-full items-center gap-2">
    <NTooltip :delay="500">
      <template #trigger>
        <button
          type="button"
          class="flex size-14 shrink-0 flex-col items-center justify-center gap-0.5 border border-dashed border-nord-3 text-nord-4 outline-none transition-colors hover:border-nord-8 hover:text-nord-6 focus-visible:border-nord-8 disabled:cursor-wait md:size-[4.5rem]"
          :disabled="isImporting"
          :aria-label="$t('photoList.addPhoto')"
          @click="fileInput?.click()"
        >
          <span v-if="isImporting" class="text-[12px] tabular-nums">
            {{ importProgress.current }}/{{ importProgress.total }}
          </span>
          <template v-else>
            <NIcon :size="20"><Plus /></NIcon>
            <span class="text-[12px]">{{ $t("photoList.add") }}</span>
          </template>
        </button>
      </template>
      {{ $t("photoList.addPhoto") }}
    </NTooltip>

    <NTag
      v-if="skippedFiles.length"
      type="error"
      size="small"
      :bordered="false"
      class="shrink-0"
      :title="skippedFiles.map((f) => f.name).join('\n')"
    >
      {{ $t("photoList.skipped", { n: skippedFiles.length }) }}
    </NTag>

    <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1.5">
      <div
        v-for="photo in photoStore.photos"
        :key="photo.id"
        class="group relative size-14 shrink-0 cursor-pointer overflow-hidden border bg-nord-0 md:size-[4.5rem]"
        :class="
          photoStore.selectedId === photo.id
            ? 'border-nord-8 outline outline-1 outline-nord-8'
            : 'border-nord-3 hover:border-nord-4'
        "
        role="button"
        tabindex="0"
        :aria-label="photo.fileName"
        :aria-pressed="photoStore.selectedId === photo.id"
        @click="photoStore.selectPhoto(photo.id)"
        @keydown.enter.prevent="photoStore.selectPhoto(photo.id)"
        @keydown.space.prevent="photoStore.selectPhoto(photo.id)"
      >
        <img :src="photo.thumbUrl" alt="" class="size-full object-cover" />

        <span
          class="touch-visible absolute top-0.5 right-0.5 flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100"
        >
          <NButton
            size="tiny"
            circle
            secondary
            :aria-label="$t('border.remove')"
            @click.stop="photoStore.removePhoto(photo.id)"
          >
            <template #icon>
              <NIcon><X /></NIcon>
            </template>
          </NButton>
        </span>

        <div
          class="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-px text-center text-[9px] text-white"
        >
          {{ photo.fileName }}
        </div>
      </div>

      <div
        v-if="photoStore.photos.length === 0"
        class="flex min-w-40 items-center justify-center text-nord-4"
      >
        {{ $t("photoList.empty") }}
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      class="hidden"
      multiple
      accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
      @change="onFileChange"
    />
  </div>
</template>
