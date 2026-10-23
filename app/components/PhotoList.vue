<script setup lang="ts">
import { ref } from "vue";
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
    <UTooltip :text="$t('photoList.addPhoto')">
      <UButton
        color="neutral"
        variant="outline"
        :loading="isImporting"
        :disabled="isImporting"
        class="size-14 shrink-0 flex-col justify-center border-dashed md:size-[4.5rem]"
        :aria-label="$t('photoList.addPhoto')"
        @click="fileInput?.click()"
      >
        <template v-if="isImporting">
          <span class="text-[10px] tabular-nums"
            >{{ importProgress.current }}/{{ importProgress.total }}</span
          >
        </template>
        <template v-else>
          <UIcon name="i-lucide-plus" class="size-5" />
          <span class="text-[10px]">{{ $t("photoList.add") }}</span>
        </template>
      </UButton>
    </UTooltip>

    <UBadge
      v-if="skippedFiles.length"
      color="error"
      variant="subtle"
      class="shrink-0"
      :title="skippedFiles.map((f) => f.name).join('\n')"
      :label="$t('photoList.skipped', { n: skippedFiles.length })"
    />

    <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto py-1.5">
      <div
        v-for="photo in photoStore.photos"
        :key="photo.id"
        class="group relative size-14 shrink-0 cursor-pointer overflow-hidden border bg-muted md:size-[4.5rem]"
        :class="
          photoStore.selectedId === photo.id
            ? 'border-primary outline outline-1 outline-primary'
            : 'border-default hover:border-accented'
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

        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="solid"
          class="touch-visible absolute top-0.5 right-0.5 p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          :aria-label="$t('border.remove')"
          @click.stop="photoStore.removePhoto(photo.id)"
        />

        <div
          class="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-px text-center text-[9px] text-white"
        >
          {{ photo.fileName }}
        </div>
      </div>

      <div
        v-if="photoStore.photos.length === 0"
        class="flex min-w-40 items-center justify-center text-muted"
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
