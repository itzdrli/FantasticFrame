<script setup lang="ts">
import { computed, ref } from "vue";
import { NButton, NIcon, NInput, NPopover } from "naive-ui";
import { Library, Search } from "@lucide/vue";
import { LOGO_LIBRARY, logoUrl } from "~~/shared/logos";

const emit = defineEmits<{ pick: [id: string] }>();

const open = ref(false);
const query = ref("");

const groups = computed(() => {
  const q = query.value.trim().toLowerCase();
  const hits = LOGO_LIBRARY.filter((l) => !q || l.name.toLowerCase().includes(q));
  return (["camera", "phone"] as const)
    .map((group) => ({ group, logos: hits.filter((l) => l.group === group) }))
    .filter((g) => g.logos.length);
});

function pick(id: string) {
  emit("pick", id);
  open.value = false;
  query.value = "";
}
</script>

<template>
  <NPopover v-model:show="open" trigger="click" placement="left-start">
    <template #trigger>
      <NButton size="tiny" block :type="open ? 'primary' : 'default'" :ghost="open">
        <template #icon>
          <NIcon><Library /></NIcon>
        </template>
        {{ $t("border.logoLibrary") }}
      </NButton>
    </template>

    <div class="flex w-80 flex-col gap-2 p-3">
      <NInput v-model:value="query" size="tiny" clearable :placeholder="$t('border.searchLogo')">
        <template #prefix>
          <NIcon><Search /></NIcon>
        </template>
      </NInput>
      <div class="flex max-h-96 flex-col gap-2 overflow-y-auto">
        <div v-for="g in groups" :key="g.group" class="flex flex-col gap-1.5">
          <span class="text-[12px] text-nord-4/60">{{ $t(`border.logoGroups.${g.group}`) }}</span>
          <div class="grid grid-cols-3 gap-1.5">
            <!-- Light chips: the files are dark artwork, recoloured only once picked -->
            <button
              v-for="logo in g.logos"
              :key="logo.id"
              type="button"
              class="flex h-14 flex-col items-center justify-center gap-1 border border-nord-3 bg-[#f4f4f4] px-2 outline-none transition-colors hover:border-nord-8 focus-visible:border-nord-8"
              :title="logo.name"
              @click="pick(logo.id)"
            >
              <img
                :src="logoUrl(logo.id)"
                :alt="logo.name"
                class="max-h-6 max-w-full object-contain"
              />
              <span class="text-[11px] text-[#555]">{{ logo.name }}</span>
            </button>
          </div>
        </div>
        <p v-if="!groups.length" class="py-4 text-center text-nord-4">
          {{ $t("border.noLogoMatch") }}
        </p>
      </div>
      <p class="text-[11px] leading-snug text-nord-4/60">{{ $t("border.logoTrademark") }}</p>
    </div>
  </NPopover>
</template>
