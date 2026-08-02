<script setup lang="ts">
import { ref } from 'vue'
import { usePhotoStore } from '~/composables/usePhotoStore'
import { useExifReader } from '~/composables/useExifReader'

const photoStore = usePhotoStore()
const { readExif } = useExifReader()
const isDragging = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

async function handleFiles(files: FileList | File[]) {
  const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
  for (const file of imageFiles) {
    const exif = await readExif(file)
    const dataUrl = await fileToDataUrl(file)
    const { width, height } = await getImageDimensions(dataUrl)
    photoStore.addPhoto({
      id: crypto.randomUUID(), fileName: file.name, fileSize: file.size,
      mimeType: file.type, dataUrl, width, height, exif, templateId: 'classic', addedAt: new Date(),
    })
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.src = dataUrl
  })
}

const onDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = true
}

const onDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
}

const onDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragging.value = false
  if (e.dataTransfer?.files) {
    handleFiles(e.dataTransfer.files)
  }
}

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files) {
    handleFiles(target.files)
    target.value = '' // reset input
  }
}
</script>

<template>
  <div 
    class="relative w-full p-8 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer bg-nord-1"
    :class="isDragging ? 'border-nord-8 bg-nord-2/50' : 'border-nord-3 hover:border-nord-9 hover:bg-nord-2'"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="fileInput?.click()"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-nord-8 mb-4 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
    <p class="text-nord-6 font-medium mb-2">拖拽照片到这里，或点击选择</p>
    <p class="text-nord-4 text-xs">支持 JPEG、PNG、WebP、HEIC 等格式</p>
    <input 
      type="file" 
      ref="fileInput" 
      class="hidden" 
      multiple 
      accept="image/*"
      @change="onFileChange"
    >
  </div>
</template>
