import { ref } from "#imports";
import { buildRenderTree } from "~~/shared/render";

interface ExifData {
  make?: string;
  model?: string;
  fNumber?: number;
  exposureTime?: number;
  exposureTimeFormatted?: string;
  iso?: number;
  focalLength?: number;
  focalLengthIn35mm?: number;
  dateTimeOriginal?: Date;
  lensModel?: string;
  latitude?: number;
  longitude?: number;
  exposureBias?: number;
}

interface TemplateConfig {
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  backgroundColor: string;
  backgroundGradient?: string;
  photoScale: number;
  paddingTop: number;
  paddingBottom: number;
  paddingHorizontal: number;
  showLogo: boolean;
  logoPosition: "left" | "center" | "right";
  logoText?: string;
  logoImageUrl?: string;
  logoWidth?: number;
  logoHeight?: number;
  infoLayout: "grid" | "list" | "horizontal";
  visibleFields: string[];
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  modelFontSize: number;
  canvasMode: "original" | "fixed" | "social";
  canvasWidth?: number;
  canvasHeight?: number;
  socialPreset?: "instagram" | "xiaohongshu" | "wechat" | "weibo";
}

interface ExportOptions {
  format: "png" | "jpeg" | "webp";
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
  /** Index of the photo currently being processed (0-based) */
  current: number;
  /** Total number of photos */
  total: number;
  /** File name of the current operation */
  filename: string;
  /** Status */
  status: "rendering" | "saving" | "done" | "error";
  /** Error message (only set when status=error) */
  errorMessage?: string;
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

let wasmPromise: Promise<typeof import("takumi-js")> | null = null;
const getTakumi = () => {
  wasmPromise ??= import("takumi-js");
  return wasmPromise;
};

/** Infers the file extension from a base64 data URL */
function extFromDataUrl(dataUrl: string): string {
  const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
  if (!m) return "jpg";
  return m[1] === "jpeg" ? "jpg" : m[1];
}

/** Builds an export file name: strips the original extension and adds the new one */
function buildExportFilename(originalName: string, ext: string): string {
  return originalName.replace(/\.[^.]+$/, "") + "." + ext;
}

export const useImageRender = () => {
  const isRendering = ref(false);
  const error = ref<string | null>(null);
  const exportFormat = ref<ExportOptions["format"]>("png");
  const exportQuality = ref<number>(95);
  const batchProgress = ref<BatchExportProgress | null>(null);

  /**
   * Internal render core (does not touch isRendering, shared by renderImage / batchExport)
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
   * Renders a single image (with state management)
   */
  const renderImage = async (payload: RenderPayload): Promise<RenderResponse | null> => {
    isRendering.value = true;
    error.value = null;
    try {
      return await _renderOne(payload);
    } catch (err: any) {
      error.value = err.message || "Render failed";
      console.error("Render error:", err);
      return null;
    } finally {
      isRendering.value = false;
    }
  };

  /**
   * Client-side WASM rendering (takumi-js automatically uses the WASM backend in browsers)
   */
  const renderClientSide = async (payload: RenderPayload): Promise<RenderResponse | null> => {
    const takumi = await getTakumi();
    const { nodeTree, width, height, format, quality } = buildRenderTree(payload);
    const buf = await takumi.render(nodeTree, { width, height, format, quality });
    const mimeType =
      format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
    return {
      imageBase64: `data:${mimeType};base64,${bytesToBase64(new Uint8Array(buf))}`,
      mimeType,
      width,
      height,
    };
  };

  /**
   * Calls the backend render API (fallback when WASM rendering fails)
   */
  const renderServerSide = async (payload: RenderPayload): Promise<RenderResponse | null> => {
    try {
      const response = await $fetch<RenderResponse>("/api/render", {
        method: "POST",
        body: payload,
      });
      return response;
    } catch (err: any) {
      error.value = err.message || "Render failed";
      console.error("Render API error:", err);
      return null;
    }
  };

  /**
   * Downloads the returned Base64 image (browser download)
   * @param base64 Complete base64 image string (includes data:image/...)
   * @param filename Download file name, without extension
   */
  const downloadImage = (base64: string, filename = "exported-image") => {
    try {
      const link = document.createElement("a");
      link.href = base64;
      const ext = extFromDataUrl(base64);
      link.download = buildExportFilename(filename, ext);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  /**
   * Saves a single image (triggers a browser download)
   */
  const saveImage = (base64: string, originalFilename: string): void => {
    downloadImage(base64, originalFilename);
  };

  /**
   * Batch-renders and exports photos.
   *
   * @param items Render params and original file name for each photo
   * @param onProgress Progress callback (optional)
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
          status: "rendering",
        };
        batchProgress.value = prog;
        onProgress?.(prog);

        try {
          const res = await _renderOne(payload);
          if (!res?.imageBase64) {
            throw new Error("Render result is empty");
          }

          batchProgress.value = { ...prog, status: "saving" };
          onProgress?.({ ...prog, status: "saving" });

          await saveImage(res.imageBase64, originalFilename);
          success++;
        } catch (err: any) {
          failed++;
          const errProg: BatchExportProgress = {
            ...prog,
            status: "error",
            errorMessage: err?.message || "Unknown error",
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
        filename: "",
        status: "done",
      };
    }

    return { success, failed };
  };

  return {
    isRendering,
    error,
    exportFormat,
    exportQuality,
    batchProgress,
    renderImage,
    batchExport,
    downloadImage,
    saveImage,
  };
};
