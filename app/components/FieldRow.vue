<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <div class="flex min-h-7 items-center justify-between gap-3 py-0.5">
    <span class="shrink-0 text-[11px] text-nord-4">{{ label }}</span>
    <div class="flex min-w-0 items-center justify-end gap-1.5"><slot /></div>
  </div>
</template>
