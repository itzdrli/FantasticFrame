import exifr from 'exifr'
import type { ExifData } from '~/types'

/**
 * 安全转换为 number，处理 exifr 返回数组/对象等异常情况
 */
function toNumber(val: unknown): number | undefined {
  if (val == null) return undefined
  if (Array.isArray(val)) val = val[0]
  const n = Number(val)
  return Number.isFinite(n) ? n : undefined
}

/**
 * 安全转换为 string
 */
function toString(val: unknown): string | undefined {
  if (val == null) return undefined
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return String(val[0] ?? '')
  return String(val)
}

/**
 * 格式化快门速度为人类可读字符串
 * e.g. 0.004 → "1/250", 1 → "1\"", 30 → "30\""
 */
function formatExposureTime(seconds: number): string {
  if (seconds >= 1) {
    return `${seconds}"`
  }
  const denominator = Math.round(1 / seconds)
  return `1/${denominator}`
}

/**
 * 格式化光圈值
 * e.g. 2.8 → "f/2.8", 1.2 → "f/1.2"
 */
export function formatFNumber(fNumber: number): string {
  if (typeof fNumber !== 'number' || !Number.isFinite(fNumber)) return ''
  return `f/${fNumber % 1 === 0 ? fNumber.toFixed(0) : fNumber.toFixed(1)}`
}

/**
 * 格式化焦距
 * e.g. 50 → "50mm"
 */
export function formatFocalLength(mm: number): string {
  return `${Math.round(mm)}mm`
}

/**
 * 格式化 ISO
 * e.g. 100 → "ISO 100"
 */
export function formatISO(iso: number): string {
  return `ISO ${iso}`
}

/**
 * 格式化曝光补偿
 * e.g. 0.3 → "+0.3 EV", -1 → "-1.0 EV", 0 → "±0 EV"
 */
export function formatExposureBias(bias: number): string {
  if (typeof bias !== 'number' || !Number.isFinite(bias)) return ''
  if (bias === 0) return '±0 EV'
  const sign = bias > 0 ? '+' : ''
  return `${sign}${bias.toFixed(1)} EV`
}

/**
 * 将 EXIF 字段格式化为展示用字符串映射
 */
export function formatExifForDisplay(exif: ExifData): Record<string, string> {
  const display: Record<string, string> = {}

  if (exif.make) display.make = exif.make
  if (exif.model) display.model = exif.model
  if (exif.lensModel) display.lensModel = exif.lensModel
  if (exif.fNumber != null) display.fNumber = formatFNumber(exif.fNumber)
  if (exif.exposureTimeFormatted) {
    display.exposureTime = exif.exposureTimeFormatted
  }
  else if (exif.exposureTime != null) {
    display.exposureTime = formatExposureTime(exif.exposureTime)
  }
  if (exif.iso != null) display.iso = formatISO(exif.iso)
  if (exif.focalLength != null) display.focalLength = formatFocalLength(exif.focalLength)
  if (exif.focalLengthIn35mm != null) {
    display.focalLengthIn35mm = formatFocalLength(exif.focalLengthIn35mm)
  }
  if (exif.exposureBias != null) display.exposureBias = formatExposureBias(exif.exposureBias)
  if (exif.dateTimeOriginal) {
    display.dateTimeOriginal = exif.dateTimeOriginal.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }
  if (exif.latitude != null && exif.longitude != null) {
    display.gps = `${exif.latitude.toFixed(6)}, ${exif.longitude.toFixed(6)}`
  }

  return display
}

/**
 * EXIF 读取 composable
 *
 * 提供从 File 对象中提取 EXIF 数据的能力，
 * 支持 exifr 解析主流相机品牌的 EXIF / IPTC / XMP。
 */
export function useExifReader() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 从 File 对象中解析 EXIF 数据
   */
  async function readExif(file: File): Promise<ExifData> {
    isLoading.value = true
    error.value = null

    try {
      // exifr 支持直接传入 File / Blob / ArrayBuffer
      const raw = await exifr.parse(file, {
        // 尽量提取所有常用字段
        exif: true,
        iptc: true,
        xmp: true,
        gps: true,
        // 解析 Makernote 以获取更多镜头/机身信息
        makerNote: false,
        // 不提取 ICC profile
        icc: false,
      })

      if (!raw) {
        return { raw: {} }
      }

      // 安全提取数值字段，防止 exifr 返回非 number 类型
      const fNumber = toNumber(raw.FNumber) ?? toNumber(raw.ApertureValue)
      const exposureTime = toNumber(raw.ExposureTime)
      const iso = toNumber(raw.ISO) ?? toNumber(raw.ISOSpeedRatings)
      const focalLength = toNumber(raw.FocalLength)
      const focalLengthIn35mm = toNumber(raw.FocalLengthIn35mmFormat)
        ?? toNumber(raw.FocalLengthIn35mmFilm)
      const exposureBias = toNumber(raw.ExposureBiasValue)
      const latitude = toNumber(raw.latitude)
      const longitude = toNumber(raw.longitude)

      const exifData: ExifData = {
        make: toString(raw.Make),
        model: toString(raw.Model),
        fNumber,
        exposureTime,
        exposureTimeFormatted: exposureTime
          ? formatExposureTime(exposureTime)
          : undefined,
        iso,
        focalLength,
        focalLengthIn35mm,
        dateTimeOriginal: raw.DateTimeOriginal
          ? new Date(raw.DateTimeOriginal)
          : undefined,
        lensModel: toString(raw.LensModel) ?? toString(raw.Lens),
        latitude,
        longitude,
        exposureBias,
        raw,
      }

      return exifData
    }
    catch (e) {
      const message = e instanceof Error ? e.message : 'EXIF 读取失败'
      error.value = message
      console.warn('[useExifReader] Parse failed:', message)
      // 解析失败仍返回空 EXIF，不阻塞后续流程
      return { raw: {} }
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * 批量读取多个文件的 EXIF
   */
  async function readExifBatch(files: File[]): Promise<ExifData[]> {
    return Promise.all(files.map(readExif))
  }

  /**
   * 从 ArrayBuffer 中解析 EXIF（用于已加载到内存的数据）
   */
  async function readExifFromBuffer(buffer: ArrayBuffer): Promise<ExifData> {
    const blob = new Blob([buffer])
    const file = new File([blob], 'buffer-image', { type: 'image/jpeg' })
    return readExif(file)
  }

  return {
    /** 是否正在解析中 */
    isLoading: readonly(isLoading),
    /** 最后一次解析错误信息 */
    error: readonly(error),
    /** 解析单张 */
    readExif,
    /** 批量解析 */
    readExifBatch,
    /** 从 ArrayBuffer 解析 */
    readExifFromBuffer,
    /** 格式化 EXIF 数据为展示用字符串 */
    formatExifForDisplay,
  }
}
