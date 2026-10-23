<script setup lang="ts">
defineProps<{ title: string }>();
const open = defineModel<boolean>("open", { default: true });
</script>

<template>
  <section class="border-b border-default">
    <div class="flex h-8 items-center pr-3">
      <button
        type="button"
        class="flex h-full min-w-0 flex-1 items-center gap-1.5 pl-2.5 text-left outline-none focus-visible:bg-elevated"
        :aria-expanded="open"
        @click="open = !open"
      >
        <UIcon
          name="i-lucide-chevron-right"
          class="size-3 shrink-0 text-dimmed transition-transform"
          :class="{ 'rotate-90': open }"
        />
        <span class="truncate text-[10px] font-semibold tracking-[0.12em] text-toned uppercase">
          {{ title }}
        </span>
      </button>
      <div class="flex items-center gap-1.5"><slot name="actions" /></div>
    </div>
    <UCollapsible v-model:open="open">
      <template #content>
        <div class="px-3 pt-1 pb-3"><slot /></div>
      </template>
    </UCollapsible>
  </section>
</template>
