<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
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
      <USwitch v-model="photoStore.syncStyle" :aria-label="$t('sync.batchSync')" />
    </FieldRow>
    <p class="text-[10px] leading-snug text-dimmed">
      {{ photoStore.syncStyle ? $t("sync.liveOn") : $t("sync.liveOff") }}
    </p>

    <div class="flex items-center justify-between">
      <span class="text-[11px] text-muted">{{ $t("sync.scope") }}</span>
      <UButton
        :label="isAllSelected ? $t('sync.clearAll') : $t('sync.selectAll')"
        variant="link"
        size="xs"
        @click="toggleAll"
      />
    </div>
    <div class="grid grid-cols-2 gap-x-2 gap-y-1.5">
      <UCheckbox
        v-for="cat in SYNC_CATEGORIES"
        :key="cat.id"
        :model-value="photoStore.syncCategories.includes(cat.id)"
        :label="$t(`sync.categories.${cat.id}`)"
        size="xs"
        :ui="{ label: 'text-[11px] font-normal text-toned' }"
        @update:model-value="photoStore.toggleSyncCategory(cat.id)"
      />
    </div>

    <UButton
      :label="appliedFlash ? $t('sync.applied') : $t('sync.applyToAll', { n: otherPhotosCount })"
      :icon="appliedFlash ? 'i-lucide-check' : 'i-lucide-copy'"
      :color="appliedFlash ? 'success' : 'neutral'"
      :variant="appliedFlash ? 'soft' : 'outline'"
      :disabled="photoStore.syncCategories.length === 0"
      block
      @click="handleApply"
    />
    <p class="text-center text-[10px] text-dimmed">{{ $t("sync.cropNote") }}</p>
  </div>
</template>
