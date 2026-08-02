<script setup lang="ts">
import { computed } from 'vue'
import { usePhotoStore } from '~/composables/usePhotoStore'
import { useTemplate } from '~/composables/useTemplate'
import type { TemplateConfig, ExifFieldKey } from '~/types'

const photoStore = usePhotoStore()
const { getResolvedConfig } = useTemplate()

const selectedPhoto = computed(() => photoStore.selectedPhoto)
const templateId = computed(() => selectedPhoto.value?.templateId || 'classic')
const overrides = computed(() => selectedPhoto.value?.templateOverrides || {})
const resolvedConfig = computed(() =>
  selectedPhoto.value ? getResolvedConfig(templateId.value, overrides.value) : null
)

const update = <K extends keyof TemplateConfig>(key: K, value: TemplateConfig[K]) => {
  if (selectedPhoto.value) {
    photoStore.updatePhotoOverrides(selectedPhoto.value.id, { [key]: value })
  }
}

const fontFamily = computed({
  get: () => overrides.value.fontFamily ?? resolvedConfig.value?.fontFamily ?? 'Inter, sans-serif',
  set: v => update('fontFamily', v),
})
const fontColor = computed({
  get: () => overrides.value.fontColor ?? resolvedConfig.value?.fontColor ?? '#000000',
  set: v => update('fontColor', v),
})
const fontSize = computed({
  get: () => overrides.value.fontSize ?? resolvedConfig.value?.fontSize ?? 14,
  set: v => update('fontSize', v),
})
const modelFontSize = computed({
  get: () => overrides.value.modelFontSize ?? resolvedConfig.value?.modelFontSize ?? 20,
  set: v => update('modelFontSize', v),
})
const infoLayout = computed({
  get: () => overrides.value.infoLayout ?? resolvedConfig.value?.infoLayout ?? 'horizontal',
  set: v => update('infoLayout', v),
})
const visibleFields = computed(() =>
  overrides.value.visibleFields ?? resolvedConfig.value?.visibleFields ?? []
)

const availableFields: { label: string; value: ExifFieldKey }[] = [
  { label: '品牌', value: 'make' },
  { label: '机型', value: 'model' },
  { label: '光圈', value: 'fNumber' },
  { label: '快门', value: 'exposureTime' },
  { label: 'ISO', value: 'iso' },
  { label: '焦距', value: 'focalLength' },
  { label: '时间', value: 'dateTimeOriginal' },
  { label: '镜头', value: 'lensModel' },
]

function toggleField(value: ExifFieldKey) {
  const fields = [...visibleFields.value]
  const idx = fields.indexOf(value)
  if (idx === -1) fields.push(value)
  else fields.splice(idx, 1)
  update('visibleFields', fields)
}

const fontOptions = [
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
  { label: 'Noto Sans SC', value: "'Noto Sans SC', sans-serif" },
  { label: 'Noto Serif SC', value: "'Noto Serif SC', serif" },
  { label: 'Georgia', value: 'Georgia, serif' },
]

const layoutOptions: { label: string; value: 'horizontal' | 'list' | 'grid' }[] = [
  { label: '横排', value: 'horizontal' },
  { label: '竖列', value: 'list' },
  { label: '网格', value: 'grid' },
]
</script>

<template>
  <div v-if="resolvedConfig" class="flex flex-col gap-5 text-sm text-nord-4">

    <!-- 字体 -->
    <div class="flex flex-col gap-3">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">字体</span>

      <!-- 字体选择 -->
      <div class="flex items-center justify-between">
        <span class="text-xs text-nord-4">字体族</span>
        <select v-model="fontFamily"
          class="bg-nord-2 border border-nord-3 rounded-lg px-2 py-1.5 text-nord-6 text-xs focus:border-nord-8 focus:outline-none transition-colors">
          <option v-for="f in fontOptions" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
      </div>

      <!-- 颜色 -->
      <div class="flex items-center justify-between">
        <span class="text-xs text-nord-4">字体颜色</span>
        <input type="color" v-model="fontColor"
          class="w-8 h-8 rounded cursor-pointer border border-nord-3 bg-nord-1 p-0.5" />
      </div>

      <!-- 参数字号 -->
      <div>
        <span class="text-xs text-nord-4 mb-1 block">参数字号 {{ fontSize }}px</span>
        <input type="range" min="10" max="36" v-model.number="fontSize" class="w-full accent-nord-8" />
      </div>

      <!-- Logo 字号 -->
      <div>
        <span class="text-xs text-nord-4 mb-1 block">Logo 字号 {{ modelFontSize }}px</span>
        <input type="range" min="14" max="48" v-model.number="modelFontSize" class="w-full accent-nord-8" />
      </div>
    </div>

    <!-- 参数布局 -->
    <div class="flex flex-col gap-3">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">参数排列</span>

      <div class="grid grid-cols-3 gap-2">
        <button v-for="opt in layoutOptions" :key="opt.value"
          @click="infoLayout = opt.value"
          class="flex items-center justify-center p-2.5 rounded-lg border transition-all text-center"
          :class="infoLayout === opt.value
            ? 'border-nord-8 bg-nord-8/10 text-nord-8'
            : 'border-nord-3 bg-nord-2 text-nord-4 hover:border-nord-9 hover:text-nord-9'">
          <span class="text-xs font-medium">{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <!-- 显示字段 -->
    <div class="flex flex-col gap-2">
      <span class="text-nord-5 font-medium border-b border-nord-2 pb-1">显示参数</span>
      <div class="grid grid-cols-2 gap-1.5">
        <label v-for="field in availableFields" :key="field.value"
          class="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg transition-colors"
          :class="visibleFields.includes(field.value)
            ? 'bg-nord-8/10 text-nord-8'
            : 'text-nord-4 hover:bg-nord-2'">
          <input type="checkbox"
            :checked="visibleFields.includes(field.value)"
            @change="toggleField(field.value)"
            class="accent-nord-8 w-3.5 h-3.5 rounded" />
          <span class="text-xs">{{ field.label }}</span>
        </label>
      </div>
    </div>

  </div>
  <div v-else class="text-nord-4 text-sm text-center py-8">请先选择一张照片</div>
</template>
