// Harness: exercises the real render pipeline (WASM render + fflate zip)
// against fixture photos — the same code the deployed function runs, built
// from src/ (not the bundle) for readable stack traces.
import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";
import { renderBatch, type BatchItem } from "../src/renderBatch";

const img =
  "data:image/jpeg;base64," + readFileSync("../tests/fixtures/with-make.jpg").toString("base64");

const cfg = {
  canvasMode: "social" as const,
  socialRatio: "1:1",
  backgroundColor: "#ffffff",
  fontFamily: "Inter, sans-serif",
  fontSize: 14,
  fontColor: "#333333",
} as any;
const mk = (name: string, format: "jpeg" | "png"): BatchItem => ({
  payload: {
    photoBase64: img,
    photoWidth: 100,
    photoHeight: 80,
    templateConfig: cfg,
    exifData: { make: "Test", model: "X100", iso: 100, fNumber: 2 },
    exportOptions: { format, quality: 90 },
  },
  originalFilename: name,
});

// ── happy path: 2 items, mixed formats ─────────────────────────────────────
const t0 = Date.now();
const r1 = await renderBatch([mk("a.jpg", "jpeg"), mk("b.jpg", "png")]);
console.log(`[1] ok=${r1.ok} done=${r1.done} failed=${r1.failed} (${Date.now() - t0}ms)`);
if (!r1.ok || r1.done !== 2) throw new Error("case 1 failed");
const entries = Object.keys(unzipSync(r1.zip!));
console.log("[1] zip entries:", entries.join(", "));
if (entries.sort().join(",") !== "a.jpg,b.png") throw new Error("unexpected zip contents");

// ── partial failure: 1 bad payload, 1 good ────────────────────────────────
const r2 = await renderBatch([
  { payload: {} as any, originalFilename: "bad.jpg" },
  mk("good.jpg", "jpeg"),
]);
console.log(`[2] ok=${r2.ok} done=${r2.done} failed=${r2.failed}`);
if (!r2.ok || r2.done !== 1 || r2.failed !== 1) throw new Error("case 2 failed");
if (Object.keys(unzipSync(r2.zip!)).join() !== "good.jpg") throw new Error("case 2 zip wrong");

// ── total failure: zip must be null ───────────────────────────────────────
const r3 = await renderBatch([{ payload: {} as any, originalFilename: "x.jpg" }]);
console.log(`[3] ok=${r3.ok} zip=${r3.zip} errors=${r3.errors[0]!.message}`);
if (r3.ok || r3.zip !== null) throw new Error("case 3 must not produce a zip");

console.log("HARNESS PASS");
