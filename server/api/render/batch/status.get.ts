import { defineEventHandler, getQuery, createError, setResponseHeader } from "h3";
import { getJob } from "../../../utils/batchRender";

export default defineEventHandler((event) => {
  const { jobId } = getQuery(event);
  const job = getJob(String(jobId ?? ""));
  if (!job) {
    throw createError({ statusCode: 404, message: "Job not found" });
  }
  setResponseHeader(event, "Cache-Control", "no-store");
  return {
    status: job.status,
    total: job.total,
    done: job.done,
    failed: job.failed,
    errors: job.status === "done" ? job.errors : undefined,
  };
});
