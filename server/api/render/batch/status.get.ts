import { defineEventHandler, getQuery, createError, setResponseHeader } from "h3";
import { getJob, releaseJob } from "../../../utils/batchRender";

export default defineEventHandler((event) => {
  const { jobId } = getQuery(event);
  const job = getJob(String(jobId ?? ""));
  if (!job) {
    throw createError({ statusCode: 404, message: "Job not found" });
  }
  setResponseHeader(event, "Cache-Control", "no-store");
  const result = {
    status: job.status,
    total: job.total,
    done: job.done,
    failed: job.failed,
    errors: job.status === "done" || job.status === "error" ? job.errors : undefined,
  };
  // An errored job has no zip and the client never calls download — release
  // it as soon as the errors are served, or failed jobs would pin the
  // MAX_JOBS slots until the TTL (every later batch would 429).
  if (job.status === "error") {
    releaseJob(job.id);
  }
  return result;
});
