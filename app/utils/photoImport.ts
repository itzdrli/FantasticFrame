import { uuid } from "~/utils/uuid";
import type { ExifData, Photo } from "~/types";

/**
 * Shared photo-import helpers — the single place that turns a File into a
 * Photo. Previously duplicated in PhotoUploader and PhotoList.
 *
 * Only formats the whole pipeline can handle end-to-end are accepted:
 * the browser must decode them for the preview AND takumi must decode them
 * for the export (client WASM + server native share the same Rust core,
 * which supports JPEG/PNG/WebP/GIF — no HEIC/HEIF/AVIF/BMP/TIFF).
 * "Supports HEIC" was previously claimed in the UI, but a HEIC file hangs
 * the browser preview (no <img> decoder) and would fail the export.
 */
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const SUPPORTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"];

/** MIME-type check with an extension fallback for browsers that report "" */
export function isSupportedImage(file: File): boolean {
  if (SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    return true;
  }
  const ext = file.name.toLowerCase().split(".").pop() || "";
  return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
}

/** Reads a File as a base64 data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Loads an image to read its intrinsic dimensions.
 *
 * Rejects on decode failure or after a timeout: an undecodable file (HEIC in
 * Chrome/Firefox, TIFF, corrupt data) never fires `onload`, and without this
 * the import would hang forever.
 */
export function getImageDimensions(
  dataUrl: string,
  timeoutMs = 10_000,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = "";
      reject(new Error("Image decode timed out"));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error("Image decode failed"));
    };
    img.src = dataUrl;
  });
}

/**
 * Builds a Photo from a file: EXIF parse and data-URL read run in parallel,
 * then the dimensions are probed from the decoded image.
 */
export async function createPhotoFromFile(
  file: File,
  readExif: (file: File) => Promise<ExifData>,
): Promise<Photo> {
  const [exif, dataUrl] = await Promise.all([readExif(file), fileToDataUrl(file)]);
  const { width, height } = await getImageDimensions(dataUrl);
  // Drop the raw exifr result before storing: it's never rendered (ExifPanel
  // uses formatExifForDisplay) and can be several KB per photo.
  const { raw: _raw, ...storedExif } = exif;
  return {
    id: uuid(),
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    dataUrl,
    width,
    height,
    exif: storedExif,
    templateId: "classic",
    crop: { fitMode: "cover", scale: 1, offsetX: 0, offsetY: 0 },
    addedAt: new Date(),
  };
}

/** Runs fn over items with limited concurrency. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  let cursor = 0;
  const results: R[] = Array.from({ length: items.length });
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
  return results;
}

export interface ImportResult {
  imported: number;
  /** Files that looked like images but aren't supported end-to-end */
  skipped: { name: string; reason: string }[];
}

/**
 * Imports image files with bounded concurrency. EXIF parsing is CPU-heavy,
 * so processing files one-by-one makes large batches feel frozen; a small
 * concurrency limit keeps the tab responsive. Each completed photo is handed
 * to `onPhoto` immediately so the UI can render progressively.
 *
 * Only `isSupportedImage` files are processed; anything else (HEIC/HEIF,
 * AVIF, BMP, TIFF, SVG photos, …) is reported as skipped so the UI can tell
 * the user instead of silently accepting a file that can't be rendered.
 */
export async function importImageFiles(
  files: FileList | File[],
  readExif: (file: File) => Promise<ExifData>,
  onPhoto: (photo: Photo) => void,
  onProgress?: (done: number, total: number) => void,
  concurrency = 3,
): Promise<ImportResult> {
  const skipped: ImportResult["skipped"] = [];
  const imageFiles = Array.from(files).filter((f) => {
    if (
      f.type.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|tiff?|svg)$/i.test(f.name)
    ) {
      if (isSupportedImage(f)) return true;
      skipped.push({
        name: f.name,
        reason: `Unsupported format (${f.type || "unknown"}); use JPEG, PNG, WebP or GIF`,
      });
      return false;
    }
    return false; // non-image files are ignored silently
  });

  let done = 0;
  await mapLimit(imageFiles, concurrency, async (file) => {
    try {
      onPhoto(await createPhotoFromFile(file, readExif));
    } catch (err) {
      console.error("[FantasticFrame] import failed:", file.name, err);
    }
    done++;
    onProgress?.(done, imageFiles.length);
  });
  return { imported: done, skipped };
}
