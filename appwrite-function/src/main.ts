import { Client, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { renderBatch, type BatchItem } from "./renderBatch";

const UPLOADS_BUCKET = process.env.FF_UPLOADS_BUCKET_ID ?? "ff-batch-uploads";
const RESULTS_BUCKET = process.env.FF_RESULTS_BUCKET_ID ?? "ff-batch-results";

function cors(origin: string | undefined) {
  // The FantasticFrame site calls this function cross-origin; echo the caller
  const o = origin && /^https?:\/\//.test(origin) ? origin : "*";
  return {
    "access-control-allow-origin": o,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers":
      "content-type, x-appwrite-project, x-appwrite-key, x-appwrite-response-format",
  };
}

export default async ({ req, res, log, error }: any) => {
  const headers = cors(req.headers?.origin);

  if (req.method === "OPTIONS") {
    return res.json({ ok: true }, 200, headers);
  }
  if (req.method !== "POST") {
    return res.json({ ok: false, message: "POST only" }, 405, headers);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT ?? "https://fra.cloud.appwrite.io/v1")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID ?? "")
    .setKey(process.env.APPWRITE_API_KEY ?? "");
  const storage = new Storage(client);

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body ?? {});
    const fileId: string = body.fileId;
    if (!fileId) return res.json({ ok: false, message: "missing fileId" }, 400, headers);

    // 1. read the request JSON the client uploaded to Storage
    const reqFile = await storage.getFileView(UPLOADS_BUCKET, fileId);
    const parsed = JSON.parse(new TextDecoder().decode(reqFile as unknown as ArrayBuffer));
    const items: BatchItem[] = parsed.items;
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ ok: false, message: "items must be a non-empty array" }, 400, headers);
    }
    log(`batch: ${items.length} items (fileId=${fileId})`);

    // 2. render + zip (WASM backend; null zip ⇔ every item failed)
    const result = await renderBatch(items);
    if (!result.zip) {
      await storage.deleteFile(UPLOADS_BUCKET, fileId).catch(() => {});
      const message = result.errors[0]?.message ?? "all items failed";
      return res.json({ ok: false, message, errors: result.errors }, 422, headers);
    }

    // 3. upload the result zip as <fileId>.zip, then remove the request file
    await storage.createFile(
      RESULTS_BUCKET,
      fileId,
      InputFile.fromBuffer(result.zip, `${fileId}.zip`),
    );
    await storage.deleteFile(UPLOADS_BUCKET, fileId).catch(() => {});
    log(`batch done: ${result.done}/${items.length} (zip ${result.zip.length} bytes)`);
    return res.json(
      { ok: true, done: result.done, failed: result.failed, errors: result.errors },
      200,
      headers,
    );
  } catch (e: any) {
    error("batch failed:", e);
    return res.json({ ok: false, message: e?.message ?? "batch failed" }, 500, headers);
  }
};
