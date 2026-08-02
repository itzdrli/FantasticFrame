<script setup lang="ts">
import { computed } from 'vue'
import { usePhotoStore } from '~/composables/usePhotoStore'
import { useTemplate } from '~/composables/useTemplate'
import { useExifReader } from '~/composables/useExifReader'

const photoStore = usePhotoStore()
const { getResolvedConfig } = useTemplate()
const { formatExifForDisplay } = useExifReader()

const MAX_PREVIEW_W = 1100
const MAX_PREVIEW_H = 760

const photo = computed(() => photoStore.selectedPhoto)

const templateConfig = computed(() => {
  if (!photo.value) return null
  return getResolvedConfig(photo.value.templateId, photo.value.templateOverrides)
})

const parsedExif = computed(() => {
  if (!photo.value?.exif) return {}
  return formatExifForDisplay(photo.value.exif)
})

// Mirrors the footer-height estimation in server/api/render.post.ts so the
// preview canvas never clips wrapped grid/horizontal EXIF rows.
function estimateFooterContentH(cfg: TemplateConfig, scaleFactor: number, canvasW: number, exifValues: string[]): number {
  const modelFontSizeBase = cfg.modelFontSize ?? 24
  const modelFontSize = Math.round(modelFontSizeBase * scaleFactor)
  const fontSize = Math.round((cfg.fontSize ?? 14) * scaleFactor)
  const logoTxt = cfg.logoText || (photo.value?.exif.make || '').toUpperCase()
  const hasLogo = cfg.showLogo !== false && (!!cfg.logoImageUrl || !!logoTxt)
  const hasExif = exifValues.length > 0

  const logoLineH = Math.ceil(modelFontSize * 1.4)
  const exifLineH = Math.ceil(fontSize * 1.4)
  const footerPaddingX = Math.max(Math.round(20 * scaleFactor), Math.round((cfg.paddingHorizontal ?? 0) * scaleFactor))
  const footerInnerW = Math.max(1, canvasW - footerPaddingX * 2)

  let exifLines = hasExif ? 1 : 0
  if (cfg.infoLayout === 'list') {
    exifLines = exifValues.length
  } else if (cfg.infoLayout === 'grid') {
    exifLines = Math.ceil(exifValues.length / 2)
  } else if (hasExif) {
    const rowGap = Math.round(10 * scaleFactor)
    const logoW = cfg.logoImageUrl
      ? Math.round((cfg.logoWidth ?? modelFontSizeBase * 5) * scaleFactor)
      : Math.ceil(logoTxt.length * modelFontSize * 0.7)
    const availExifW = hasLogo && cfg.logoPosition !== 'center'
      ? Math.max(1, footerInnerW - logoW - Math.round(16 * scaleFactor))
      : footerInnerW
    let curW = 0
    for (const t of exifValues) {
      const w = t.length * fontSize * 0.62
      if (curW > 0 && curW + rowGap + w > availExifW) {
        exifLines++
        curW = w
      } else {
        curW += (curW > 0 ? rowGap : 0) + w
      }
    }
  }

  const gridGapV = Math.round(4 * scaleFactor)
  const rowGap = Math.round((cfg.infoLayout === 'list' ? 4 : 10) * scaleFactor)
  const exifBlockH = hasExif
    ? exifLines * exifLineH + Math.max(0, exifLines - 1) * (cfg.infoLayout === 'grid' ? gridGapV : rowGap)
    : 0
  const logoImageH = cfg.logoImageUrl
    ? Math.round((cfg.logoHeight ?? modelFontSizeBase * 1.4) * scaleFactor)
    : 0
  const logoBlockH = hasLogo ? Math.max(logoLineH, logoImageH) : 0

  if (hasLogo && hasExif && cfg.logoPosition === 'center') {
    return logoBlockH + Math.round(12 * scaleFactor) + exifBlockH
  }
  return Math.max(logoBlockH, exifBlockH)
}

// Instagram 比例对应的画布尺寸（宽固定 1080）
const instagramDims = (ratio?: string) => {
  const heights: Record<string, number> = {
    '1:1': 1080,
    '4:5': 1350,
    '5:4': 864,
    '3:4': 1440,
    '4:3': 810,
    '1.91:1': 565,
    '1:1.91': 2063,
  }
  return { w: 1080, h: heights[ratio || '4:5'] || 1350 }
}

// 1080-base 缩放因子：按画布长边计算，竖屏与横屏比例一致
const baseScaleFactor = computed(() => {
  const cfg = templateConfig.value
  const p = photo.value
  if (!cfg || !p) return 1
  if (cfg.canvasMode === 'social' && cfg.socialPreset === 'instagram') {
    const d = instagramDims(cfg.socialRatio)
    return Math.max(d.w, d.h) / 1080
  }
  if (cfg.canvasMode === 'social' && cfg.socialPreset) {
    const presets: Record<string, { w: number; h: number }> = {
      xiaohongshu: { w: 1080, h: 1440 },
      wechat: { w: 1080, h: 1920 },
      weibo: { w: 1080, h: 1080 }
    }
    const d = presets[cfg.socialPreset] || { w: 1080, h: 1080 }
    return Math.max(d.w, d.h) / 1080
  }
  if (cfg.canvasMode === 'fixed' && cfg.canvasWidth && cfg.canvasHeight) {
    return Math.max(cfg.canvasWidth, cfg.canvasHeight) / 1080
  }
  return Math.max(p.width, p.height) / 1080
})

const canvasDims = computed(() => {
  if (!photo.value || !templateConfig.value) return { w: 0, h: 0 }
  const cfg = templateConfig.value
  const p = photo.value
  
  if (cfg.canvasMode === 'social' && cfg.socialPreset === 'instagram') {
    return instagramDims(cfg.socialRatio)
  } else if (cfg.canvasMode === 'social' && cfg.socialPreset) {
    const presets: Record<string, { w: number; h: number }> = {
      xiaohongshu: { w: 1080, h: 1440 },
      wechat: { w: 1080, h: 1920 },
      weibo: { w: 1080, h: 1080 }
    }
    return presets[cfg.socialPreset] || { w: 1080, h: 1080 }
  } else if (cfg.canvasMode === 'fixed' && cfg.canvasWidth && cfg.canvasHeight) {
    return { w: cfg.canvasWidth, h: cfg.canvasHeight }
  }

  // original mode: dynamic height
  const w = p.width
  const scaleFactor = baseScaleFactor.value
  const paddingH = (cfg.paddingHorizontal ?? 0) * scaleFactor
  const paddingTop = (cfg.paddingTop ?? 0) * scaleFactor
  const paddingBottom = (cfg.paddingBottom ?? 0) * scaleFactor
  const exifEntries = cfg.visibleFields.filter((f: string) => parsedExif.value[f])
  const footerContentH = estimateFooterContentH(cfg, scaleFactor, w, exifEntries.map((f: string) => parsedExif.value[f]))
  const footerH = exifEntries.length > 0 || (cfg.showLogo !== false && (!!cfg.logoImageUrl || (cfg.logoText || (p.exif.make || '').toUpperCase())))
    ? 40 * scaleFactor + footerContentH
    : 0
  
  const availW = w - paddingH * 2
  const pAspect = p.width / p.height
  const imgH = availW / pAspect
  const h = Math.round(imgH + paddingTop + paddingBottom + footerH)
  return { w, h }
})

const previewScale = computed(() => {
  const { w, h } = canvasDims.value
  if (!w || !h) return 1
  return Math.min(MAX_PREVIEW_W / w, MAX_PREVIEW_H / h, 1)
})

const previewDims = computed(() => {
  const { w, h } = canvasDims.value
  return {
    w: w * previewScale.value,
    h: h * previewScale.value
  }
})

const configScale = computed(() => {
  // scales a 1080px-based config value to the PREVIEW canvas pixels
  // full canvas config value = val * baseScaleFactor
  // preview config value = full config value * previewScale
  return baseScaleFactor.value * previewScale.value
})

const s = (v: number) => Math.round(v * configScale.value)

const imageRenderStyle = computed(() => {
  if (!photo.value || !templateConfig.value) return {}
  const cfg = templateConfig.value
  const p = photo.value
  const { w: canvasW, h: canvasH } = canvasDims.value
  
  const scaleFactor = baseScaleFactor.value
  const pt = (cfg.paddingTop ?? 0) * scaleFactor
  const pb = (cfg.paddingBottom ?? 0) * scaleFactor
  const ph = (cfg.paddingHorizontal ?? 0) * scaleFactor
  
  const exifEntries = cfg.visibleFields.filter((f: string) => parsedExif.value[f])
  const footerContentH = estimateFooterContentH(cfg, scaleFactor, canvasW, exifEntries.map((f: string) => parsedExif.value[f]))
  const footerH = exifEntries.length > 0 || (cfg.showLogo !== false && (!!cfg.logoImageUrl || (cfg.logoText || (p.exif.make || '').toUpperCase())))
    ? 40 * scaleFactor + footerContentH
    : 0
  
  const availW = canvasW - ph * 2
  const availH = Math.max(1, canvasH - footerH - pt - pb)
  const pAspect = p.width / p.height
  
  let imgW, imgH
  if (availW > 0 && availH > 0 && pAspect > availW / availH) {
    imgW = availW
    imgH = Math.round(availW / pAspect)
  } else {
    imgH = availH
    imgW = Math.round(availH * pAspect)
  }
  
  const finalW = Math.round(imgW * (cfg.photoScale ?? 0.9))
  const finalH = Math.round(imgH * (cfg.photoScale ?? 0.9))
  const ps = previewScale.value
  
  return {
    width: `${Math.round(finalW * ps)}px`,
    height: `${Math.round(finalH * ps)}px`,
    borderWidth: `${s(cfg.borderWidth)}px`,
    borderColor: cfg.borderColor,
    borderStyle: cfg.borderWidth > 0 ? 'solid' : 'none',
    borderRadius: `${s(cfg.borderRadius)}px`,
    objectFit: 'contain' as const,
    display: 'block' as const,
    boxSizing: 'border-box' as const
  }
})

const displayExifEntries = computed(() => {
  if (!templateConfig.value || !parsedExif.value) return []
  return templateConfig.value.visibleFields
    .map(f => ({ key: f, value: parsedExif.value[f] }))
    .filter(e => e.value)
})

// Keep single-string for fallback
const exifText = computed(() => displayExifEntries.value.map(e => e.value).join('  '))

const hasExif = computed(() => displayExifEntries.value.length > 0)

const resolvedLogoImage = computed(() => {
  if (!templateConfig.value) return ''
  return templateConfig.value.logoImageUrl || ''
})

const resolvedLogoText = computed(() => {
  if (!templateConfig.value || !photo.value) return ''
  return templateConfig.value.logoText || (photo.value.exif.make || '').toUpperCase()
})

const hasLogo = computed(() =>
  templateConfig.value?.showLogo !== false && (!!resolvedLogoImage.value || !!resolvedLogoText.value)
)

const logoStyle = computed(() => {
  if (!templateConfig.value) return {}
  return {
    fontSize: `${s(templateConfig.value.modelFontSize)}px`,
    fontWeight: 'bold',
    color: templateConfig.value.fontColor,
    fontFamily: templateConfig.value.fontFamily,
  }
})

const exifItemStyle = computed(() => {
  if (!templateConfig.value) return {}
  return {
    fontSize: `${s(templateConfig.value.fontSize)}px`,
    color: templateConfig.value.fontColor,
    fontFamily: templateConfig.value.fontFamily,
  }
})

const exifContainerStyle = computed(() => {
  const layout = templateConfig.value?.infoLayout || 'horizontal'
  if (layout === 'list') {
    return {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: `${s(4)}px`,
    }
  }
  if (layout === 'grid') {
    return {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, auto)',
      gap: `${s(4)}px ${s(14)}px`,
    }
  }
  // horizontal
  return {
    display: 'flex',
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: `${s(2)}px ${s(14)}px`,
  }
})

const logoImgWidth = computed(() => {
  const cfg = templateConfig.value
  if (!cfg) return 0
  return s(cfg.logoWidth ?? (cfg.modelFontSize ?? 20) * 5)
})

const logoImgHeight = computed(() => {
  const cfg = templateConfig.value
  if (!cfg) return 0
  return s(cfg.logoHeight ?? (cfg.modelFontSize ?? 20) * 1.4)
})

const canvasStyle = computed(() => {
  if (!templateConfig.value) return {}
  const cfg = templateConfig.value
  return {
    width: `${previewDims.value.w}px`,
    height: `${previewDims.value.h}px`,
    background: cfg.backgroundGradient || cfg.backgroundColor || '#fff',
    fontFamily: cfg.fontFamily,
    color: cfg.fontColor,
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden' as const,
  }
})

const footerStyle = computed(() => {
  if (!templateConfig.value) return {}
  const cfg = templateConfig.value
  const horizPad = Math.max(s(20), s(cfg.paddingHorizontal))
  return {
    width: '100%',
    paddingLeft: `${horizPad}px`,
    paddingRight: `${horizPad}px`,
    paddingTop: `${s(20)}px`,
    paddingBottom: `${s(20)}px`,
    boxSizing: 'border-box' as const,
    display: 'flex',
    flexDirection: cfg.logoPosition === 'center' ? 'column' as const : 'row' as const,
    alignItems: 'center',
    justifyContent: cfg.logoPosition === 'center' ? 'center' : 'space-between',
    gap: `${s(16)}px`,
    flexShrink: 0,
  }
})

// aliases for template compatibility
const logoTextStyle = computed(() => logoStyle.value)
const exifTextStyle = computed(() => exifItemStyle.value)
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full w-full p-4">
    <!-- Empty State -->
    <div v-if="!photo || !templateConfig" class="flex items-center justify-center h-full w-full text-nord-4 bg-nord-1 rounded-lg border border-nord-2 border-dashed shadow-md">
      <div class="flex flex-col items-center justify-center p-8 text-center gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-nord-3 w-16 h-16"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        <p class="text-xl font-semibold">Please upload and select a photo</p>
      </div>
    </div>
    
    <div v-else class="flex flex-col w-full items-center gap-4">
    
    <!-- Canvas Wrapper -->
    <div class="flex items-center justify-center w-full">
      <div :style="canvasStyle" class="shadow-2xl">
        <div class="flex-1 w-full flex items-center justify-center" :style="{ paddingTop: `${s(templateConfig.paddingTop)}px`, paddingBottom: `${s(templateConfig.paddingBottom)}px`, paddingLeft: `${s(templateConfig.paddingHorizontal)}px`, paddingRight: `${s(templateConfig.paddingHorizontal)}px` }">
          <img :src="photo.dataUrl" :style="imageRenderStyle" />
        </div>
        
        <!-- Footer -->
        <div v-if="hasLogo || hasExif" :style="footerStyle">
          <!-- Right position: EXIF first, logo pushed to the right edge -->
          <template v-if="templateConfig.logoPosition === 'right'">
            <div v-if="!hasLogo" class="flex-1" />
            <div v-if="hasExif" :style="exifContainerStyle">
              <span v-for="entry in displayExifEntries" :key="entry.key" :style="exifItemStyle">
                {{ entry.value }}
              </span>
            </div>
            <div v-if="hasLogo && hasExif" class="flex-1" />
            <template v-if="hasLogo">
              <img v-if="resolvedLogoImage" :src="resolvedLogoImage"
                :style="{ width: `${logoImgWidth}px`, height: `${logoImgHeight}px`, objectFit: 'contain' }" />
              <span v-else :style="logoStyle">{{ resolvedLogoText }}</span>
            </template>
          </template>

          <!-- Left / center positions -->
          <template v-else>
            <template v-if="hasLogo">
              <img v-if="resolvedLogoImage" :src="resolvedLogoImage"
                :style="{ width: `${logoImgWidth}px`, height: `${logoImgHeight}px`, objectFit: 'contain' }" />
              <span v-else :style="logoStyle">{{ resolvedLogoText }}</span>
            </template>

            <!-- Spacer for left/right layouts -->
            <div v-if="templateConfig.logoPosition !== 'center' && hasLogo && hasExif" class="flex-1" />

            <!-- EXIF entries with dynamic layout -->
            <div v-if="hasExif" :style="exifContainerStyle">
              <span v-for="entry in displayExifEntries" :key="entry.key" :style="exifItemStyle">
                {{ entry.value }}
              </span>
            </div>
          </template>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>
