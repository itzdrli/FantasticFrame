import { defineEventHandler, createError } from "h3";
import { createBatchJob, jobCount } from "../../utils/batchRender";
import { validateTemplateConfig } from "../../../shared/validate";
import {
  MAX_BATCH_BODY_BYTES,
  MAX_BATCH_ITEMS,
  MAX_JOBS,
  MAX_PHOTO_BYTES,
  MAX_TOTAL_PHOTO_BYTES,
  estimateBase64Bytes,
  readJsonBodyCapped,
} from "../../utils/limits";

export default defineEventHandler(async (event) => {
  const body = await readJsonBodyCapped(event, MAX_BATCH_BODY_BYTES);
  const items = body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, message: "items must be a non-empty array" });
  }
  if (items.length > MAX_BATCH_ITEMS) {
    throw createError({
      statusCode: 413,
      message: `Too many photos in one batch (max ${MAX_BATCH_ITEMS})`,
    });
  }
  if (jobCount() >= MAX_JOBS) {
    throw createError({
      statusCode: 429,
      message: "Too many batch jobs running — wait for the current one to finish",
    });
  }

  // Validate + size every item BEFORE creating the job, so a batch of huge
  // PNGs is rejected up front instead of being buffered into a job.
  let totalBytes = 0;
  for (const item of items) {
    const name = item?.originalFilename ?? "?";
    const payload = item?.payload;
    const photoBase64 = payload?.photoBase64;
    if (typeof photoBase64 !== "string" || !photoBase64.startsWith("data:image/")) {
      throw createError({
        statusCode: 400,
        message: `Item "${name}" needs a payload.photoBase64 image data URL`,
      });
    }
    const bytes = estimateBase64Bytes(photoBase64);
    if (bytes > MAX_PHOTO_BYTES) {
      throw createError({
        statusCode: 413,
        message: `Photo too large: ${name} (max ${Math.round(MAX_PHOTO_BYTES / 1e6)}MB per photo)`,
      });
    }
    if (!payload.templateConfig) {
      throw createError({ statusCode: 400, message: `Item "${name}" is missing templateConfig` });
    }
    const check = validateTemplateConfig(payload.templateConfig);
    if (!check.valid) {
      throw createError({
        statusCode: 400,
        message: `Invalid templateConfig for ${name}: ${check.errors.join("; ")}`,
      });
    }
    totalBytes += bytes;
  }
  if (totalBytes > MAX_TOTAL_PHOTO_BYTES) {
    throw createError({
      statusCode: 413,
      message: `Batch too large: total photos exceed ${Math.round(MAX_TOTAL_PHOTO_BYTES / 1e6)}MB — reduce the number or size of photos`,
    });
  }

  const job = createBatchJob(items);
  return { jobId: job.id, total: job.total };
});
