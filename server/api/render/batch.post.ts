import { defineEventHandler, readBody, createError } from "h3";
import { createBatchJob, type BatchItem } from "../../utils/batchRender";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const items: BatchItem[] = body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, message: "items must be a non-empty array" });
  }

  const job = createBatchJob(items);
  return { jobId: job.id, total: job.total };
});
