<script setup lang="ts">
import { computed } from 'vue'
import { usePhotoStore } from '~/composables/usePhotoStore'
import { useExifReader } from '~/composables/useExifReader'

const photoStore = usePhotoStore()
const { formatExifForDisplay } = useExifReader()

const fieldLabels: Record<string, string> = {
  make: '品牌',
  model: '机型',
  lensModel: '镜头',
  fNumber: '光圈',
  exposureTime: '快门',
  iso: 'ISO',
  focalLength: '焦距',
  focalLengthIn35mm: '等效焦距',
  exposureBias: '曝光补偿',
  dateTimeOriginal: '拍摄时间',
  gps: 'GPS'
}

const entries = computed(() => {
  const photo = photoStore.selectedPhoto
  if (!photo?.exif) return []
  return Object.entries(formatExifForDisplay(photo.exif))
})
</script>

<template>
  <div v-if="entries.length" class="grid grid-cols-2 gap-x-4 gap-y-3">
    <div v-for="[key, val] in entries" :key="key" class="flex flex-col min-w-0">
      <span class="text-nord-4 text-xs">{{ fieldLabels[key] || key }}</span>
      <span class="text-nord-6 text-sm font-medium truncate" :title="String(val)">{{ val }}</span>
    </div>
  </div>
  <div v-else class="text-nord-4/60 text-xs text-center py-8">暂无 EXIF 信息</div>
</template>
