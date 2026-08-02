import { ref } from '#imports';
import { buildRenderTree } from '../../shared/render';
import { useElectrobunRpc } from '~/composables/useElectrobunRpc';

interface ExifData {
  make?: string; model?: string; fNumber?: number; exposureTime?: number;
  exposureTimeFormatted?: string; iso?: number; focalLength?: number;
  focalLengthIn35mm?: number; dateTimeOriginal?: Date; lensModel?: string;
  latitude?: number; longitude?: number; exposureBias?: number;
}

interface TemplateConfig {
  borderWidth: number; borderColor: string; borderRadius: number;
  backgroundColor: string; backgroundGradient?: string;
  photoScale: number; paddingTop: number; paddingBottom: number; paddingHorizontal: number;
  showLogo: boolean; logoPosition: 'left' | 'center' | 'right';
  logoText?: string; logoImageUrl?: string; logoWidth?: number; logoHeight?: number;
  infoLayout: 'grid' | 'list' | 'horizontal';
  visibleFields: string[];
  fontFamily: string; fontSize: number; fontColor: string; modelFontSize: number;
  canvasMode: 'original' | 'fixed' | 'social';
  canvasWidth?: number; canvasHeight?: number;
  socialPreset?: 'instagram' | 'xiaohongshu' | 'wechat' | 'weibo';
}

interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
}

export interface RenderPayload {
  photoBase64: string;
  exifData?: ExifData;
  templateId?: string;
  templateConfig: TemplateConfig;
  exportOptions?: ExportOptions;
  /** Original photo width in pixels */
  photoWidth?: number;
  /** Original photo height in pixels */
  photoHeight?: number;
}

export interface RenderResponse {
  imageBase64: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface BatchExportProgress {
  /** 正在处理的照片索引（0-based） */
  current: number;
  /** 照片总数 */
  total: number;
  /** 当前操作的文件名 */
  filename: string;
  /** 状态 */
  status: 'rendering' | 'saving' | 'done' | 'error';
  /** 错误信息（仅 status=error 时有值） */
  errorMessage?: string;
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

let wasmPromise: Promise<typeof import('takumi-js')> | null = null;
const getTakumi = () => {
  wasmPromise ??= import('takumi-js');
  return wasmPromise;
};

/** 从 base64 data URL 中推断文件扩展名 */
function extFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
  if (!m) return 'jpg';
  return m[1] === 'jpeg' ? 'jpg' : m[1];
}

/** 构造导出文件名：去掉原始扩展名 + 新扩展名 */
function buildExportFilename(originalName: string, ext: string): string {
  return originalName.replace(/\.[^.]+$/, '') + '.' + ext;
}

export const useImageRender = () => {
  const isRendering = ref(false);
  const error = ref<string | null>(null);
  const exportFormat = ref<ExportOptions['format']>('png');
  const exportQuality = ref<number>(95);
  const exportDir = ref<string>('');
  const batchProgress = ref<BatchExportProgress | null>(null);

  const { isDesktop, selectExportDir: rpcSelectDir, saveFile: rpcSaveFile } = useElectrobunRpc();

  /**
   * 内部渲染核心（不操作 isRendering，供 renderImage / batchExport 复用）
   */
  const _renderOne = async (payload: RenderPayload): Promise<RenderResponse | null> => {
    const finalPayload = payload.exportOptions
      ? payload
      : { ...payload, exportOptions: { format: exportFormat.value, quality: exportQuality.value } };

    if (import.meta.client) {
      const clientResult = await renderClientSide(finalPayload);
      if (clientResult) return clientResult;
    }
    return await renderServerSide(finalPayload);
  };

  /**
   * 单张渲染（含状态管理）
   */
  const renderImage = async (payload: RenderPayload): Promise<RenderResponse | null> => {
    isRendering.value = true;
    error.value = null;
    try {
      return await _renderOne(payload);
    } catch (err: any) {
      error.value = err.message || '渲染失败';
      console.error('Render error:', err);
      return null;
    } finally {
      isRendering.value = false;
    }
  };

  /**
   * 浏览器端 WASM 渲染（takumi-js 在浏览器环境自动使用 WASM 后端）
   */
  const renderClientSide = async (payload: RenderPayload): Promise<RenderResponse | null> => {
    const takumi = await getTakumi();
    const { nodeTree, width, height, format, quality } = buildRenderTree(payload);
    const buf = await takumi.render(nodeTree, { width, height, format, quality });
    const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
    return {
      imageBase64: `data:${mimeType};base64,${bytesToBase64(new Uint8Array(buf))}`,
      mimeType,
      width,
      height,
    };
  };

  /**
   * 调用后端渲染接口（WASM 渲染失败时的回退）
   */
  const renderServerSide = async (payload: RenderPayload): Promise<RenderResponse | null> => {
    try {
      const response = await $fetch<RenderResponse>('/api/render', {
        method: 'POST',
        body: payload,
      });
      return response;
    } catch (err: any) {
      error.value = err.message || '渲染失败';
      console.error('Render API error:', err);
      return null;
    }
  };

  /**
   * 下载返回的 Base64 图片（浏览器模式下触发下载）
   * @param base64 完整的 base64 图片字符串 (包含 data:image/...)
   * @param filename 下载文件名，不含扩展名
   */
  const downloadImage = (base64: string, filename = 'exported-image') => {
    try {
      const link = document.createElement('a');
      link.href = base64;
      const ext = extFromDataUrl(base64);
      link.download = buildExportFilename(filename, ext);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  /**
   * 打开系统目录选择对话框，更新 exportDir。
   * 仅在桌面端（Electrobun）有效；浏览器端不做任何事。
   */
  const pickExportDir = async (): Promise<void> => {
    const dir = await rpcSelectDir(exportDir.value || undefined);
    if (dir) exportDir.value = dir;
  };

  /**
   * 将单张图片保存到 exportDir（桌面端）或触发浏览器下载。
   */
  const saveImage = async (base64: string, originalFilename: string): Promise<void> => {
    const ext = extFromDataUrl(base64);
    const filename = buildExportFilename(originalFilename, ext);

    if (isDesktop() && exportDir.value) {
      await rpcSaveFile(exportDir.value, filename, base64);
    } else {
      downloadImage(base64, originalFilename);
    }
  };

  /**
   * 批量渲染并导出照片。
   *
   * @param items  每张照片的渲染参数及原始文件名
   * @param onProgress 进度回调（可选）
   */
  const batchExport = async (
    items: Array<{ payload: RenderPayload; originalFilename: string }>,
    onProgress?: (p: BatchExportProgress) => void,
  ): Promise<{ success: number; failed: number }> => {
    isRendering.value = true;
    error.value = null;
    batchProgress.value = null;

    let success = 0;
    let failed = 0;

    try {
      for (let i = 0; i < items.length; i++) {
        const { payload, originalFilename } = items[i];

        const prog: BatchExportProgress = {
          current: i,
          total: items.length,
          filename: originalFilename,
          status: 'rendering',
        };
        batchProgress.value = prog;
        onProgress?.(prog);

        try {
          const res = await _renderOne(payload);
          if (!res?.imageBase64) {
            throw new Error('渲染结果为空');
          }

          batchProgress.value = { ...prog, status: 'saving' };
          onProgress?.({ ...prog, status: 'saving' });

          await saveImage(res.imageBase64, originalFilename);
          success++;
        } catch (err: any) {
          failed++;
          const errProg: BatchExportProgress = {
            ...prog,
            status: 'error',
            errorMessage: err?.message || '未知错误',
          };
          batchProgress.value = errProg;
          onProgress?.(errProg);
          console.error(`[FantasticFrame] batch export failed for ${originalFilename}:`, err);
        }
      }
    } finally {
      isRendering.value = false;
      batchProgress.value = {
        current: items.length,
        total: items.length,
        filename: '',
        status: 'done',
      };
    }

    return { success, failed };
  };

  return {
    isRendering,
    error,
    exportFormat,
    exportQuality,
    exportDir,
    batchProgress,
    renderImage,
    batchExport,
    downloadImage,
    saveImage,
    pickExportDir,
    isDesktop,
  };
};
