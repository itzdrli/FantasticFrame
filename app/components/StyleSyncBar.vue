<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { NButton, NCheckbox, NIcon, NSwitch } from "naive-ui";
import { Check, Copy } from "@lucide/vue";
import { usePhotoStore } from "~/composables/usePhotoStore";
import { ALL_SYNC_CATEGORIES, SYNC_CATEGORIES } from "~/utils/photoStyle";

const photoStore = usePhotoStore();
const appliedFlash = ref(false);
let flashTimer: ReturnType<typeof setTimeout> | null = null;

const otherPhotosCount = computed(() => Math.max(0, photoStore.count - 1));

const isAllSelected = computed(
  () => photoStore.syncCategories.length === ALL_SYNC_CATEGORIES.length,
);

function toggleAll() {
  if (isAllSelected.value) photoStore.clearAllCategories();
  else photoStore.selectAllCategories();
}

function handleApply() {
  if (photoStore.syncCategories.length === 0) return;
  photoStore.applyStyleToAll(photoStore.syncCategories);
  appliedFlash.value = true;
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => (appliedFlash.value = false), 2000);
}

onUnmounted(() => {
  if (flashTimer) clearTimeout(flashTimer);
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <FieldRow :label="`${$t('sync.batchSync')} ${$t('sync.photosCount', { n: photoStore.count })}`">
      <NSwitch
        v-model:value="photoStore.syncStyle"
        size="small"
        :aria-label="$t('sync.batchSync')"
      />
    </FieldRow>
    <p class="text-[10px] leading-snug text-nord-4/60">
      {{ photoStore.syncStyle ? $t("sync.liveOn") : $t("sync.liveOff") }}
    </p>

    <div class="flex items-center justify-between">
      <span class="text-[11px] text-nord-4">{{ $t("sync.scope") }}</span>
      <NButton text type="primary" size="tiny" @click="toggleAll">
        {{ isAllSelected ? $t("sync.clearAll") : $t("sync.selectAll") }}
      </NButton>
    </div>
    <div class="grid grid-cols-2 gap-x-2 gap-y-1.5">
      <NCheckbox
        v-for="cat in SYNC_CATEGORIES"
        :key="cat.id"
        :checked="photoStore.syncCategories.includes(cat.id)"
        :label="$t(`sync.categories.${cat.id}`)"
        size="small"
        @update:checked="photoStore.toggleSyncCategory(cat.id)"
      />
    </div>

    <NButton
      size="tiny"
      block
      :type="appliedFlash ? 'success' : 'default'"
      :secondary="appliedFlash"
      :disabled="photoStore.syncCategories.length === 0"
      @click="handleApply"
    >
      <template #icon>
        <NIcon><component :is="appliedFlash ? Check : Copy" /></NIcon>
      </template>
      {{ appliedFlash ? $t("sync.applied") : $t("sync.applyToAll", { n: otherPhotosCount }) }}
    </NButton>
    <p class="text-center text-[10px] text-nord-4/60">{{ $t("sync.cropNote") }}</p>
  </div>
</template>
