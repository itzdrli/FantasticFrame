/**
 * FantasticFrame — 核心类型定义
 */

// ==================== EXIF 相关 ====================

/** 从照片中提取的 EXIF 元数据 */
export interface ExifData {
  /** 相机品牌, e.g. "Canon", "Sony" */
  make?: string
  /** 相机型号, e.g. "EOS R5", "A7M4" */
  model?: string
  /** 光圈值, e.g. 2.8 */
  fNumber?: number
  /** 快门速度（秒）, e.g. 0.004 → 1/250 */
  exposureTime?: number
  /** 快门速度的格式化字符串, e.g. "1/250" */
  exposureTimeFormatted?: string
  /** ISO 感光度, e.g. 100, 800 */
  iso?: number
  /** 焦距 (mm), e.g. 50 */
  focalLength?: number
  /** 等效 35mm 焦距, e.g. 75 */
  focalLengthIn35mm?: number
  /** 拍摄时间 */
  dateTimeOriginal?: Date
  /** 镜头型号, e.g. "RF 50mm F1.2L USM" */
  lensModel?: string
  /** GPS 纬度 */
  latitude?: number
  /** GPS 经度 */
  longitude?: number
  /** 曝光补偿, e.g. -0.3, +1.0 */
  exposureBias?: number
  /** 原始 EXIF 对象（exifr 解析结果） */
  raw?: Record<string, unknown>
}

// ==================== 照片 ====================

/** 单张照片的完整状态 */
export interface Photo {
  /** 唯一 ID */
  id: string
  /** 原始文件名 */
  fileName: string
  /** 原始文件大小 (bytes) */
  fileSize: number
  /** MIME 类型 */
  mimeType: string
  /** 原图 Base64 Data URL */
  dataUrl: string
  /** 原图宽度 (px) */
  width: number
  /** 原图高度 (px) */
  height: number
  /** 提取的 EXIF 数据 */
  exif: ExifData
  /** 当前应用的模板 ID */
  templateId: string
  /** 当前模板配置覆写 */
  templateOverrides?: Partial<TemplateConfig>
  /** 添加时间 */
  addedAt: Date
}

// ==================== 模板系统 ====================

/** 边框模板定义 */
export interface Template {
  /** 模板唯一 ID */
  id: string
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 缩略图路径 */
  thumbnail?: string
  /** 默认配置 */
  defaultConfig: TemplateConfig
}

/** 模板可配置项 */
export interface TemplateConfig {
  // —— 边框 ——
  /** 边框粗细 (px) */
  borderWidth: number
  /** 边框颜色 */
  borderColor: string
  /** 边框圆角 (px) */
  borderRadius: number

  // —— 背景 ——
  /** 背景颜色 */
  backgroundColor: string
  /** 背景渐变 (CSS gradient string, 空则不使用) */
  backgroundGradient?: string

  // —— 照片与边框比例 ——
  /** 照片在画布中的缩放比例 (0-1) */
  photoScale: number
  /** 照片上方内边距 (px) */
  paddingTop: number
  /** 照片下方内边距 (px) */
  paddingBottom: number
  /** 照片左右内边距 (px) */
  paddingHorizontal: number

  // —— 品牌 Logo ——
  /** 是否显示品牌 Logo */
  showLogo: boolean
  /** Logo 显示位置 */
  logoPosition: 'left' | 'center' | 'right'
  /** 自定义 Logo 文字（为空时自动使用相机品牌 Make） */
  logoText?: string
  /** 自定义 Logo 图片 Data URL（优先级高于文字 Logo） */
  logoImageUrl?: string
  /** Logo 图片宽度 (1080 基准 px，默认 机型字号 × 5) */
  logoWidth?: number
  /** Logo 图片高度 (1080 基准 px，默认 机型字号 × 1.4) */
  logoHeight?: number

  // —— 参数排版 ——
  /** 参数行排版方式 */
  infoLayout: 'grid' | 'list' | 'horizontal'
  /** 显示哪些 EXIF 字段 */
  visibleFields: ExifFieldKey[]

  // —— 字体 ——
  /** 字体族 */
  fontFamily: string
  /** 参数字号 (px) */
  fontSize: number
  /** 字体颜色 */
  fontColor: string
  /** 机型字号 (px) */
  modelFontSize: number

  // —— 画布 ——
  /** 输出画布比例模式 */
  canvasMode: 'original' | 'fixed' | 'social'
  /** 固定比例宽 (canvasMode='fixed' 时生效) */
  canvasWidth?: number
  /** 固定比例高 (canvasMode='fixed' 时生效) */
  canvasHeight?: number
  /** 社交平台预设 (canvasMode='social' 时生效) */
  socialPreset?: 'instagram' | 'xiaohongshu' | 'wechat' | 'weibo'
  /** Instagram 比例 (socialPreset='instagram' 时生效) */
  socialRatio?: '1:1' | '4:5' | '3:4' | '1.91:1' | '5:4' | '4:3' | '1:1.91'
}

/** EXIF 字段 key，用于配置可见性 */
export type ExifFieldKey =
  | 'make'
  | 'model'
  | 'fNumber'
  | 'exposureTime'
  | 'iso'
  | 'focalLength'
  | 'dateTimeOriginal'
  | 'lensModel'
  | 'gps'

// ==================== 导出 ====================

/** 导出格式 */
export type ExportFormat = 'png' | 'jpeg' | 'webp'

/** 导出质量 (JPEG/WebP 0-100) */
export interface ExportOptions {
  format: ExportFormat
  quality: number
}

// ==================== 渲染请求 ====================

/** 发送给 server/api/render 的请求体 */
export interface RenderRequest {
  /** 照片 Base64 */
  photoBase64: string
  /** EXIF 数据 */
  exifData: ExifData
  /** 模板 ID */
  templateId: string
  /** 模板配置 */
  templateConfig: TemplateConfig
  /** 导出选项 */
  exportOptions: ExportOptions
}

/** 渲染结果 */
export interface RenderResponse {
  /** 渲染后图片的 Base64 */
  imageBase64: string
  /** MIME 类型 */
  mimeType: string
  /** 渲染后尺寸 */
  width: number
  height: number
}
