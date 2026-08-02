<script setup lang="ts">
import { usePhotoStore } from '~/composables/usePhotoStore'
import { useImageRender } from '~/composables/useImageRender'
import { useTemplate } from '~/composables/useTemplate'

useHead({
  title: 'FantasticFrame',
  meta: [
    { name: 'description', content: 'FantasticFrame - elegant photo borders and layouts.' }
  ]
})

const photoStore = usePhotoStore()
const {
  renderImage, saveImage, batchExport,
  isRendering, error,
  exportFormat, exportQuality,
  exportDir, pickExportDir,
  batchProgress, isDesktop,
} = useImageRender()
const { getResolvedConfig } = useTemplate()

const showSettings = ref(true)
const showExif = ref(true)

// ── 批量导出状态 ────────────────────────────────────────────────────────────
const isBatchExporting = ref(false)
const batchResult = ref<{ success: number; failed: number } | null>(null)
const showBatchResultToast = ref(false)
let batchToastTimer: ReturnType<typeof setTimeout> | null = null

const exportFormats: { label: string; value: 'png' | 'jpeg' | 'webp' }[] = [
  { label: 'PNG', value: 'png' },
  { label: 'JPEG', value: 'jpeg' },
  { label: 'WebP', value: 'webp' },
]

// ── 单张导出 ────────────────────────────────────────────────────────────────
async function handleExport() {
  const photo = photoStore.selectedPhoto
  if (!photo) return
  const templateConfig = getResolvedConfig(photo.templateId, photo.templateOverrides)
  const res = await renderImage({
    photoBase64: photo.dataUrl,
    exifData: photo.exif,
    templateConfig,
    photoWidth: photo.width,
    photoHeight: photo.height,
  })
  if (res?.imageBase64) {
    await saveImage(res.imageBase64, photo.fileName)
  }
}

// ── 批量导出 ────────────────────────────────────────────────────────────────
async function handleBatchExport() {
  if (photoStore.photos.length === 0) return

  isBatchExporting.value = true
  batchResult.value = null
  showBatchResultToast.value = false

  const items = photoStore.photos.map(photo => ({
    payload: {
      photoBase64: photo.dataUrl,
      exifData: photo.exif,
      templateConfig: getResolvedConfig(photo.templateId, photo.templateOverrides),
      photoWidth: photo.width,
      photoHeight: photo.height,
    },
    originalFilename: photo.fileName,
  }))

  const result = await batchExport(items)
  batchResult.value = result
  isBatchExporting.value = false

  // 显示结果提示
  showBatchResultToast.value = true
  if (batchToastTimer) clearTimeout(batchToastTimer)
  batchToastTimer = setTimeout(() => { showBatchResultToast.value = false }, 5000)
}

// 批量进度百分比
const batchPercent = computed(() => {
  const p = batchProgress.value
  if (!p || p.total === 0) return 0
  return Math.round((p.current / p.total) * 100)
})

const exportButtonDisabled = computed(() =>
  isRendering.value || !photoStore.selectedPhoto || isBatchExporting.value
)

const batchExportDisabled = computed(() =>
  isRendering.value || photoStore.photos.length === 0 || isBatchExporting.value
)

// 目录显示（截短长路径）
const exportDirDisplay = computed(() => {
  if (!exportDir.value) return ''
  const parts = exportDir.value.replace(/\\/g, '/').split('/')
  if (parts.length <= 3) return exportDir.value
  return '…/' + parts.slice(-2).join('/')
})
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-nord-0 text-nord-4">
    <!-- Top Nav -->
    <header class="h-16 shrink-0 flex items-center justify-between px-6 bg-nord-1 border-b-2 border-nord-3">
      <div class="flex items-center gap-3">
        <div class="text-xl font-semibold text-nord-6 tracking-tight">Fantastic Frame</div>
        <button
          @click="showSettings = !showSettings"
          class="px-3 py-1.5 text-xs rounded shadow transition-colors flex items-center gap-1.5"
          :class="showSettings ? 'bg-nord-8 text-nord-0 font-medium' : 'bg-nord-2 text-nord-4 hover:bg-nord-3'">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          设置
        </button>
        <button
          @click="showExif = !showExif"
          class="px-3 py-1.5 text-xs rounded shadow transition-colors flex items-center gap-1.5"
          :class="showExif ? 'bg-nord-8 text-nord-0 font-medium' : 'bg-nord-2 text-nord-4 hover:bg-nord-3'">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17h6m-6-4h6m-6-4h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
          </svg>
          EXIF
        </button>
      </div>

      <!-- 右上角导出区域 -->
      <div class="flex items-center gap-2">
        <!-- 批量导出按钮 -->
        <button
          @click="handleBatchExport"
          :disabled="batchExportDisabled"
          class="px-4 py-2 bg-nord-3 text-nord-6 font-medium rounded shadow hover:bg-nord-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm"
          :title="`批量导出所有 ${photoStore.photos.length} 张照片`"
        >
          <svg v-if="!isBatchExporting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span v-if="!isBatchExporting">全部导出 ({{ photoStore.photos.length }})</span>
          <span v-else>导出中 {{ batchPercent }}%</span>
        </button>

        <!-- 单张导出按钮 -->
        <button
          @click="handleExport"
          :disabled="exportButtonDisabled"
          class="px-4 py-2 bg-nord-8 text-nord-0 font-medium rounded shadow hover:bg-nord-9 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <span v-if="isRendering && !isBatchExporting">导出中...</span>
          <span v-else>导出</span>
        </button>
      </div>
    </header>

    <!-- 批量导出进度条 -->
    <Transition name="slide-down">
      <div v-if="isBatchExporting && batchProgress" class="h-1 bg-nord-1 shrink-0">
        <div
          class="h-full bg-nord-8 transition-all duration-300"
          :style="{ width: `${batchPercent}%` }"
        />
      </div>
    </Transition>

    <!-- 批量导出结果 Toast -->
    <Transition name="toast">
      <div v-if="showBatchResultToast && batchResult"
        class="fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-3 border"
        :class="batchResult.failed === 0
          ? 'bg-nord-14/10 border-nord-14/30 text-nord-14'
          : 'bg-nord-11/10 border-nord-11/30 text-nord-11'"
      >
        <svg v-if="batchResult.failed === 0" class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <span v-if="batchResult.failed === 0">
          全部 {{ batchResult.success }} 张导出成功
          <span v-if="exportDir && isDesktop()"> → {{ exportDirDisplay }}</span>
        </span>
        <span v-else>
          {{ batchResult.success }} 成功 / {{ batchResult.failed }} 失败
        </span>
      </div>
    </Transition>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: Preview & Photo Strip -->
      <main class="flex-1 flex flex-col relative overflow-hidden bg-nord-0">
        <!-- Preview Area -->
        <div class="flex-1 relative overflow-auto flex items-center justify-center p-8 bg-[repeating-conic-gradient(#3B4252_0_25%,#2E3440_0_50%)] bg-[length:24px_24px]">
          <div v-if="photoStore.selectedPhoto" class="max-w-full max-h-full flex items-center justify-center">
            <PreviewPanel />
          </div>
          <div v-else class="flex flex-col items-center justify-center max-w-md w-full bg-nord-1/80 backdrop-blur rounded-xl p-8 border border-nord-2 shadow-lg">
            <h2 class="text-xl text-nord-6 font-semibold mb-4 text-center">Get Started</h2>
            <p class="text-nord-4 text-center mb-6">Upload photos to begin creating your fantastic frames.</p>
            <PhotoUploader />
          </div>
        </div>

        <!-- Photo Strip Bottom -->
        <div class="h-32 shrink-0 border-t-2 border-nord-3 bg-nord-1 flex items-center px-4 overflow-x-auto">
          <PhotoList />
        </div>
      </main>

      <!-- Left: EXIF Floating Drawer -->
      <Transition name="exif-drawer">
        <aside v-if="showExif"
          class="fixed top-16 left-0 z-40 w-[380px] max-h-[calc(100vh-4rem)] bg-nord-1 border-r-2 border-b-2 border-nord-3 shadow-2xl flex flex-col rounded-br-xl overflow-hidden">
          <div class="p-4 flex items-center justify-between border-b border-nord-2 shrink-0">
            <span class="text-sm font-semibold text-nord-6">EXIF 信息</span>
            <button @click="showExif = false"
              class="w-7 h-7 flex items-center justify-center rounded hover:bg-nord-3 text-nord-4 hover:text-nord-6 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="overflow-y-auto p-4">
            <ExifPanel />
          </div>
        </aside>
      </Transition>

      <!-- Right: Settings Floating Drawer -->
      <Transition name="settings-drawer">
        <aside v-if="showSettings"
          class="fixed top-16 right-0 bottom-0 w-[400px] z-40 bg-nord-1 border-l-2 border-nord-3 shadow-2xl flex flex-col">
          <div class="p-4 flex items-center justify-between border-b border-nord-2 shrink-0">
            <span class="text-sm font-semibold text-nord-6">设置</span>
            <button @click="showSettings = false"
              class="w-7 h-7 flex items-center justify-center rounded hover:bg-nord-3 text-nord-4 hover:text-nord-6 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
            <section>
              <h3 class="text-sm font-semibold text-nord-6 uppercase tracking-wider mb-3">Template</h3>
              <TemplateSelector />
            </section>

            <hr class="border-nord-2" />

            <section>
              <h3 class="text-sm font-semibold text-nord-6 uppercase tracking-wider mb-3">Borders</h3>
              <BorderSettings />
            </section>

            <hr class="border-nord-2" />

            <section>
              <h3 class="text-sm font-semibold text-nord-6 uppercase tracking-wider mb-3">Typography</h3>
              <TypeSettings />
            </section>

            <hr class="border-nord-2" />

            <!-- Export Section -->
            <section>
              <h3 class="text-sm font-semibold text-nord-6 uppercase tracking-wider mb-3">Export</h3>
              <div class="flex flex-col gap-3 text-sm text-nord-4">
                <!-- 格式 -->
                <div class="flex items-center justify-between">
                  <span class="text-xs text-nord-4">格式</span>
                  <div class="flex rounded-lg overflow-hidden border border-nord-3">
                    <button v-for="f in exportFormats" :key="f.value"
                      @click="exportFormat = f.value"
                      class="px-3 py-1 text-xs transition-colors"
                      :class="exportFormat === f.value ? 'bg-nord-8 text-nord-0 font-medium' : 'bg-nord-2 text-nord-4 hover:bg-nord-3'">
                      {{ f.label }}
                    </button>
                  </div>
                </div>

                <!-- 质量 -->
                <div v-if="exportFormat !== 'png'">
                  <span class="text-xs text-nord-4 mb-1 block">质量 {{ exportQuality }}%</span>
                  <input type="range" min="50" max="100" v-model.number="exportQuality" class="w-full accent-nord-8" />
                </div>
                <p v-if="exportFormat === 'png'" class="text-[10px] text-nord-4/70">PNG 为无损格式，无需质量设置</p>
                <p v-else-if="exportFormat === 'webp'" class="text-[10px] text-nord-4/70">浏览器端 WebP 为无损编码，质量滑杆仅服务端生效</p>
                <p v-else class="text-[10px] text-nord-4/70">JPEG 有损压缩，质量越高文件越大</p>

                <!-- 导出目录（仅桌面端显示） -->
                <template v-if="isDesktop()">
                  <hr class="border-nord-2 my-1" />
                  <div class="flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-nord-4">导出目录</span>
                      <button
                        @click="pickExportDir"
                        class="px-2 py-1 text-xs bg-nord-2 border border-nord-3 rounded-lg text-nord-4 hover:border-nord-8 hover:text-nord-8 transition-colors flex items-center gap-1"
                      >
                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                        </svg>
                        选择
                      </button>
                    </div>
                    <div
                      class="flex items-center gap-2 px-3 py-2 bg-nord-2 rounded-lg border border-nord-3 min-h-[34px]"
                      :class="exportDir ? 'border-nord-3' : 'border-dashed'"
                    >
                      <svg class="w-3.5 h-3.5 shrink-0 text-nord-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                      </svg>
                      <span v-if="exportDirDisplay" class="text-[11px] text-nord-6 font-mono truncate" :title="exportDir">{{ exportDirDisplay }}</span>
                      <span v-else class="text-[11px] text-nord-3 italic">未设置（默认触发下载）</span>
                      <button v-if="exportDir" @click="exportDir = ''"
                        class="ml-auto text-nord-3 hover:text-nord-11 transition-colors text-xs shrink-0"
                        title="清除">
                        ✕
                      </button>
                    </div>
                    <p class="text-[10px] text-nord-4/60">设置后导出将直接保存到该目录，不弹出另存框</p>
                  </div>
                </template>
              </div>
            </section>
          </div>
        </aside>
      </Transition>
    </div>
  </div>
</template>
