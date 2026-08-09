import { uuid } from "~/utils/uuid";
import type { ExifData, Photo } from "~/types";

/**
 * Shared photo-import helpers — the single place that turns a File into a
 * Photo. Previously duplicated in PhotoUploader and PhotoList.
 */

/** Reads a File as a base64 data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Loads an image to read its intrinsic dimensions. */
export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
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
  return {
    id: uuid(),
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    dataUrl,
    width,
    height,
    exif,
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

/**
 * Imports image files with bounded concurrency. EXIF parsing is CPU-heavy,
 * so processing files one-by-one makes large batches feel frozen; a small
 * concurrency limit keeps the tab responsive. Each completed photo is handed
 * to `onPhoto` immediately so the UI can render progressively.
 *
 * @returns the number of image files processed
 */
export async function importImageFiles(
  files: FileList | File[],
  readExif: (file: File) => Promise<ExifData>,
  onPhoto: (photo: Photo) => void,
  onProgress?: (done: number, total: number) => void,
  concurrency = 3,
): Promise<number> {
  const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
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
  return imageFiles.length;
}
