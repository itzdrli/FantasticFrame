import { defineStore } from 'pinia'
import type { ExportOptions, Photo, TemplateConfig } from '~/types'

/**
 * 照片状态管理 Store
 *
 * 管理所有已导入照片的生命周期：增删选中、EXIF 绑定、模板配置覆写。
 */
export const usePhotoStore = defineStore('photos', () => {
  /** 所有照片列表 */
  const photos = ref<Photo[]>([])

  /** 当前选中照片的 ID */
  const selectedId = ref<string | null>(null)

  /** 默认导出选项 */
  const exportOptions = ref<ExportOptions>({
    format: 'png',
    quality: 95,
  })

  // ==================== Getters ====================

  /** 当前选中的照片 */
  const selectedPhoto = computed(() =>
    photos.value.find(p => p.id === selectedId.value) ?? null,
  )

  /** 照片总数 */
  const count = computed(() => photos.value.length)

  /** 是否有照片 */
  const hasPhotos = computed(() => photos.value.length > 0)

  // ==================== Actions ====================

  /** 添加一张照片 */
  function addPhoto(photo: Photo) {
    photos.value.push(photo)
    // 如果是第一张，自动选中
    if (photos.value.length === 1) {
      selectedId.value = photo.id
    }
  }

  /** 批量添加照片 */
  function addPhotos(newPhotos: Photo[]) {
    const wasEmpty = photos.value.length === 0
    photos.value.push(...newPhotos)
    if (wasEmpty && photos.value.length > 0) {
      selectedId.value = photos.value[0].id
    }
  }

  /** 移除一张照片 */
  function removePhoto(id: string) {
    const index = photos.value.findIndex(p => p.id === id)
    if (index === -1) return

    photos.value.splice(index, 1)

    // 如果移除的是当前选中的，切换到相邻照片
    if (selectedId.value === id) {
      if (photos.value.length === 0) {
        selectedId.value = null
      }
      else {
        const newIndex = Math.min(index, photos.value.length - 1)
        selectedId.value = photos.value[newIndex].id
      }
    }
  }

  /** 清空所有照片 */
  function clearAll() {
    photos.value = []
    selectedId.value = null
  }

  /** 选中指定照片 */
  function selectPhoto(id: string) {
    if (photos.value.some(p => p.id === id)) {
      selectedId.value = id
    }
  }

  /** 更新照片的模板配置覆写 */
  function updateTemplateOverrides(id: string, overrides: Partial<TemplateConfig>) {
    const photo = photos.value.find(p => p.id === id)
    if (photo) {
      photo.templateOverrides = {
        ...photo.templateOverrides,
        ...overrides,
      }
    }
  }

  /** 切换照片使用的模板 */
  function setPhotoTemplate(id: string, templateId: string) {
    const photo = photos.value.find(p => p.id === id)
    if (photo) {
      photo.templateId = templateId
      // 切换模板时清空个性化覆写
      photo.templateOverrides = undefined
    }
  }

  /** 为所有照片批量应用同一模板 */
  function applyTemplateToAll(templateId: string) {
    photos.value.forEach((photo) => {
      photo.templateId = templateId
      photo.templateOverrides = undefined
    })
  }

  return {
    // state
    photos,
    selectedId,
    exportOptions,
    // getters
    selectedPhoto,
    count,
    hasPhotos,
    // actions
    addPhoto,
    addPhotos,
    removePhoto,
    clearAll,
    selectPhoto,
    updateTemplateOverrides,
    /** 别名：组件使用 updatePhotoOverrides */
    updatePhotoOverrides: updateTemplateOverrides,
    setPhotoTemplate,
    /** 别名：组件使用 updatePhotoTemplate */
    updatePhotoTemplate: setPhotoTemplate,
    applyTemplateToAll,
  }
})
