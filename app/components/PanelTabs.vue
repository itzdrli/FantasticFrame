<script setup lang="ts">
const settings = defineModel<boolean>("settings", { required: true });
const exif = defineModel<boolean>("exif", { required: true });

const btn = "px-3 py-1.5 text-xs rounded shadow transition-colors flex items-center gap-1.5";
const on = "bg-nord-8 text-nord-0 font-medium";
const off = "bg-nord-2 text-nord-4 hover:bg-nord-3";
</script>

<template>
  <div class="flex items-center gap-3">
    <button type="button" :class="[btn, settings ? on : off]" @click="settings = !settings">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      {{ $t("app.settings") }}
    </button>
    <button type="button" :class="[btn, exif ? on : off]" @click="exif = !exif">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 17h6m-6-4h6m-6-4h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
        />
      </svg>
      {{ $t("app.exif") }}
    </button>
  </div>
</template>
