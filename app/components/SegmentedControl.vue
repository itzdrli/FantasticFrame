<script setup lang="ts">
defineProps<{ items: { label: string; value: string }[] }>();
const model = defineModel<string>({ required: true });
</script>

<template>
  <UTabs
    v-model="model"
    :items="items"
    :content="false"
    variant="pill"
    size="xs"
    color="neutral"
    :ui="{
      root: 'w-full',
      list: 'w-full rounded-[3px] border border-default bg-muted p-0.5',
      indicator: 'rounded-[2px] bg-accented shadow-none',
      trigger:
        'flex-1 justify-center rounded-[2px] px-1.5 py-1 text-[11px] data-[state=active]:text-highlighted',
    }"
  />
</template>
