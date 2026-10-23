<script setup lang="ts">
import { NCollapseTransition, NIcon } from "naive-ui";
import { ChevronRight } from "@lucide/vue";

defineProps<{ title: string }>();
const open = defineModel<boolean>("open", { default: true });
</script>

<template>
  <section class="border-b border-nord-3">
    <div class="flex h-10 items-center pr-4">
      <button
        type="button"
        class="flex h-full min-w-0 flex-1 items-center gap-2 pl-3 text-left outline-none focus-visible:bg-nord-2"
        :aria-expanded="open"
        @click="open = !open"
      >
        <NIcon
          :size="14"
          class="shrink-0 text-nord-4/60 transition-transform"
          :class="{ 'rotate-90': open }"
        >
          <ChevronRight />
        </NIcon>
        <span class="truncate text-[12px] font-bold tracking-[0.12em] text-nord-5 uppercase">
          {{ title }}
        </span>
      </button>
      <div class="flex items-center gap-1.5"><slot name="actions" /></div>
    </div>
    <NCollapseTransition :show="open">
      <div class="px-4 pt-1 pb-4"><slot /></div>
    </NCollapseTransition>
  </section>
</template>
