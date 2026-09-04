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
  if (isAllSelected.value) {
    photoStore.clearAllCategories();
  } else {
    photoStore.selectAllCategories();
  }
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
  <div class="p-4 border-b border-nord-2 flex flex-col gap-3 shrink-0 text-sm text-nord-4">
    <!-- Section header & Live Sync toggle -->
    <div class="flex items-center justify-between border-b border-nord-2 pb-1">
      <div class="flex items-center gap-2">
        <span class="text-nord-5 font-medium">{{ $t("sync.batchSync") }}</span>
        <span class="text-[10px] text-nord-4/70">{{
          $t("sync.photosCount", { n: photoStore.count })
        }}</span>
      </div>
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          v-model="photoStore.syncStyle"
          class="accent-nord-8 w-3.5 h-3.5 rounded"
        />
        <span class="text-xs">{{ $t("sync.liveSync") }}</span>
      </label>
    </div>

    <!-- Live sync status / description -->
    <p class="text-[10px] text-nord-4/70">
      {{ photoStore.syncStyle ? $t("sync.liveOn") : $t("sync.liveOff") }}
    </p>

    <!-- Scope selection -->
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <span class="text-xs text-nord-4">{{ $t("sync.scope") }}</span>
        <button type="button" @click="toggleAll" class="text-[10px] text-nord-8 hover:underline">
          {{ isAllSelected ? $t("sync.clearAll") : $t("sync.selectAll") }}
        </button>
      </div>

      <!-- Category selection grid matching TypeSettings availableFields -->
      <div class="grid grid-cols-2 gap-1.5">
        <label
          v-for="cat in SYNC_CATEGORIES"
          :key="cat.id"
          class="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg transition-colors"
          :class="
            photoStore.syncCategories.includes(cat.id)
              ? 'bg-nord-8/10 text-nord-8'
              : 'text-nord-4 hover:bg-nord-2'
          "
          :title="$t(`sync.categories.${cat.id}`)"
        >
          <input
            type="checkbox"
            :checked="photoStore.syncCategories.includes(cat.id)"
            @change="photoStore.toggleSyncCategory(cat.id)"
            class="accent-nord-8 w-3.5 h-3.5 rounded"
          />
          <span class="text-xs truncate">{{ $t(`sync.categories.${cat.id}`) }}</span>
        </label>
      </div>
    </div>

    <!-- Apply to all button -->
    <button
      type="button"
      :disabled="photoStore.syncCategories.length === 0"
      class="w-full py-2 text-xs rounded-lg border transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
      :class="
        appliedFlash
          ? 'border-nord-14 bg-nord-14/10 text-nord-14 font-medium'
          : 'border-nord-3 bg-nord-2 text-nord-4 hover:border-nord-8 hover:text-nord-8'
      "
      @click="handleApply"
    >
      <svg
        v-if="!appliedFlash"
        class="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
      <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <span>
        {{ appliedFlash ? $t("sync.applied") : $t("sync.applyToAll", { n: otherPhotosCount }) }}
      </span>
    </button>

    <p class="text-[10px] text-nord-4/70 text-center">
      {{ $t("sync.cropNote") }}
    </p>
  </div>
</template>
