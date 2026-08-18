// True end-to-end harness for the BUNDLED dist/main.js: runs a local HTTP
// server that emulates the three Appwrite Storage endpoints the function
// uses, points APPWRITE_ENDPOINT at it, and invokes the function's req/res
// protocol. No module mocking — real HTTP, real bundle.
import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";

const img =
  "data:image/jpeg;base64," + readFileSync("../tests/fixtures/with-make.jpg").toString("base64");
const fileId = "e2e-file-1";
const uploadJson = JSON.stringify({
  items: [
    {
      payload: {
        photoBase64: img,
        photoWidth: 100,
        photoHeight: 80,
        templateConfig: {
          canvasMode: "social",
          socialRatio: "1:1",
          backgroundColor: "#ffffff",
          fontFamily: "Inter, sans-serif",
          fontSize: 14,
          fontColor: "#333333",
        },
        exifData: { make: "Test", model: "X100", iso: 100 },
        exportOptions: { format: "jpeg", quality: 90 },
      },
      originalFilename: "a.jpg",
    },
    {
      payload: {
        photoBase64: img,
        photoWidth: 100,
        photoHeight: 80,
        templateConfig: {
          canvasMode: "social",
          socialRatio: "1:1",
          backgroundColor: "#ffffff",
          fontFamily: "Inter, sans-serif",
          fontSize: 14,
          fontColor: "#333333",
        },
        exifData: { make: "Test", model: "X100", iso: 100 },
        exportOptions: { format: "png", quality: 90 },
      },
      originalFilename: "b.jpg",
    },
  ],
});

const uploaded: { bucket: string; body: Uint8Array }[] = [];
const deleted: string[] = [];
const calls: string[] = [];

const server = Bun.serve({
  port: 0,
  async fetch(req) {
    const u = new URL(req.url);
    const p = u.pathname.replace(/^\/v1/, "");
    calls.push(`${req.method} ${p}`);
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "content-type": "application/json" },
      });

    let m: RegExpMatchArray | null;
    if ((m = p.match(/^\/storage\/buckets\/([^/]+)\/files\/([^/]+)\/view$/))) {
      if (m[2] === fileId) return new Response(new TextEncoder().encode(uploadJson));
      return json({ message: "File not found", code: 404 }, 404);
    }
    if ((m = p.match(/^\/storage\/buckets\/([^/]+)\/files$/)) && req.method === "POST") {
      const form = await req.formData();
      const file = form.get("file") as File;
      const body = new Uint8Array(await file.arrayBuffer());
      uploaded.push({ bucket: m[1]!, body });
      return json({ $id: fileId, bucketId: m[1]!, name: file.name });
    }
    if ((m = p.match(/^\/storage\/buckets\/([^/]+)\/files\/([^/]+)$/)) && req.method === "DELETE") {
      deleted.push(`${m[1]}/${m[2]}`);
      return new Response(null, { status: 204 });
    }
    return json({ message: "not found", code: 404 }, 404);
  },
});

process.env.APPWRITE_ENDPOINT = `http://localhost:${server.port}/v1`;
process.env.APPWRITE_FUNCTION_PROJECT_ID = "test-project";
process.env.APPWRITE_API_KEY = "test-key";

const main = (await import("../dist/main.js")).default;

const res: any = {
  json(data: unknown, status: number, headers: unknown) {
    const out = { data, status, headers };
    this.last = out;
    return out;
  },
};
const req = {
  method: "POST",
  body: JSON.stringify({ fileId }),
  headers: { origin: "https://ff.itzdrli.cc" },
};

const t0 = Date.now();
await main({
  req,
  res,
  log: (...a: unknown[]) => console.log("[log]", ...a),
  error: (...a: unknown[]) => console.error("[err]", ...a),
});
const out = res.last;

console.log("RESULT:", JSON.stringify(out.data));
console.log("status:", out.status, "in", Date.now() - t0, "ms");
console.log("api calls:", calls.join(" | "));
console.log("cors:", JSON.stringify(out.headers));

const zipUpload = uploaded.find((r) => r.bucket === "ff-batch-results");
if (!zipUpload) throw new Error("NO ZIP UPLOADED");
const files = unzipSync(zipUpload.body);
console.log(
  "zip entries:",
  Object.keys(files).map((k) => `${k} (${files[k]!.length}B)`),
);
if (Object.keys(files).length !== 2) throw new Error("EXPECTED 2 ENTRIES");
if (out.status !== 200 || !out.data.ok || out.data.done !== 2)
  throw new Error("expected ok done=2");
if (!deleted.includes(`ff-batch-uploads/${fileId}`)) throw new Error("upload not cleaned up");
server.stop();
console.log("E2E BUNDLE PASS");
process.exit(0);
