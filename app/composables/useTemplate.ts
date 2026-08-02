import type { TemplateConfig } from '~/types'

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  borderWidth: 0,
  borderColor: '#FFFFFF',
  borderRadius: 0,
  backgroundColor: '#FFFFFF',
  photoScale: 1.0,
  paddingTop: 40,
  paddingBottom: 40,
  paddingHorizontal: 40,
  showLogo: true,
  logoPosition: 'center',
  logoText: '',
  infoLayout: 'horizontal',
  visibleFields: ['model', 'fNumber', 'exposureTime', 'iso', 'focalLength'],
  fontFamily: 'Inter, sans-serif',
  fontSize: 16,
  fontColor: '#333333',
  modelFontSize: 26,
  canvasMode: 'original',
}

export const PRESET_TEMPLATES: Record<string, Partial<TemplateConfig>> = {
  // ─── 经典留白 ─────────────────────────────────────────────────────────────
  // 白底，照片四周均等留白，底部居中显示机型 + 参数，排版干净整洁
  'classic': {
    backgroundColor: '#FFFFFF',
    photoScale: 1.0,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    borderWidth: 0,
    borderRadius: 0,
    showLogo: true,
    logoPosition: 'center',
    fontFamily: 'Inter, sans-serif',
    fontColor: '#1A1A1A',
    fontSize: 15,
    modelFontSize: 24,
    infoLayout: 'horizontal',
    visibleFields: ['model', 'fNumber', 'exposureTime', 'iso', 'focalLength'],
  },

  // ─── 暗黑风格 ─────────────────────────────────────────────────────────────
  // 深灰底，照片无边框铺满，底部横向显示机型（左）与参数（右）
  'dark': {
    backgroundColor: '#1C1C1E',
    photoScale: 1.0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    borderRadius: 0,
    showLogo: true,
    logoPosition: 'left',
    fontFamily: 'Inter, sans-serif',
    fontColor: '#E5E5EA',
    fontSize: 15,
    modelFontSize: 22,
    infoLayout: 'horizontal',
    visibleFields: ['model', 'fNumber', 'exposureTime', 'iso'],
  },

  // ─── 极简风格 ─────────────────────────────────────────────────────────────
  // 近白底，照片占满，仅底部用细小衬线字体显示拍摄日期，无 logo
  'minimal': {
    backgroundColor: '#F8F8F6',
    photoScale: 1.0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    borderRadius: 0,
    showLogo: false,
    fontFamily: "'Georgia', serif",
    fontColor: '#6B6B6B',
    fontSize: 14,
    modelFontSize: 20,
    infoLayout: 'horizontal',
    visibleFields: ['model', 'dateTimeOriginal'],
  },

  // ─── 胶片风格 ─────────────────────────────────────────────────────────────
  // 纯黑底，粗黑边框内嵌照片，底部左对齐机型、右侧参数，复古暖色调字体
  'film-style': {
    backgroundColor: '#0D0D0D',
    photoScale: 1.0,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 0,
    borderRadius: 0,
    showLogo: true,
    logoPosition: 'left',
    fontFamily: "'Georgia', serif",
    fontColor: '#D4C5A0',
    fontSize: 15,
    modelFontSize: 22,
    infoLayout: 'horizontal',
    visibleFields: ['make', 'model', 'fNumber', 'exposureTime', 'iso'],
  },

  // ─── 卡片风格 ─────────────────────────────────────────────────────────────
  // 浅灰底，照片带大圆角（近拍立得风格），底部居中展示品牌 + 参数
  'card-style': {
    backgroundColor: '#F0F0F0',
    photoScale: 1.0,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderWidth: 0,
    borderRadius: 12,
    showLogo: true,
    logoPosition: 'center',
    fontFamily: 'Inter, sans-serif',
    fontColor: '#2C2C2E',
    fontSize: 14,
    modelFontSize: 22,
    infoLayout: 'horizontal',
    visibleFields: ['model', 'fNumber', 'exposureTime', 'iso'],
  },
}

export function useTemplate() {
  const getResolvedConfig = (templateId: string, overrides: Partial<TemplateConfig> = {}): TemplateConfig => {
    const preset = PRESET_TEMPLATES[templateId] || {}
    return {
      ...DEFAULT_TEMPLATE_CONFIG,
      ...preset,
      ...overrides,
    }
  }

  return {
    getResolvedConfig,
    PRESET_TEMPLATES,
    DEFAULT_TEMPLATE_CONFIG,
  }
}
