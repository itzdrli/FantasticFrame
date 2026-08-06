import { defineEventHandler, getQuery, createError, send, setResponseHeaders } from "h3";
import { getJob, releaseJob } from "../../../utils/batchRender";

export default defineEventHandler(async (event) => {
  const { jobId } = getQuery(event);
  const job = getJob(String(jobId ?? ""));
  if (!job) {
    throw createError({ statusCode: 404, message: "Job not found" });
  }
  if (job.status !== "done") {
    throw createError({ statusCode: 409, message: "Job not finished yet" });
  }

  const buf = Buffer.concat(job.zipChunks);
  releaseJob(job.id); // free the zip bytes as soon as it is served

  // Node rejects non-ASCII in header values, so ship an ASCII fallback name
  // plus the RFC 5987 UTF-8 form for the real (possibly CJK) filename
  const asciiName = job.zipName.replace(/[^\x20-\x7E]/g, "_");
  setResponseHeaders(event, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(job.zipName)}`,
    "Content-Length": String(buf.length),
    "Cache-Control": "private, no-store",
    "x-ff-export-success": String(job.done),
    "x-ff-export-failed": String(job.failed),
  });
  return send(event, buf);
});
