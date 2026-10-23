<script setup lang="ts">
import { NTab, NTabs } from "naive-ui";

defineProps<{ items: { label: string; value: string }[] }>();
const model = defineModel<string>({ required: true });
</script>

<template>
  <NTabs v-model:value="model" type="segment" size="small" animated class="w-full">
    <NTab v-for="item in items" :key="item.value" :name="item.value" :tab="item.label" />
  </NTabs>
</template>
