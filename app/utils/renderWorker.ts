import { renderInBrowser, type BrowserRenderInput, type RenderResult } from "./browserRender";

type Pending = { resolve: (r: RenderResult) => void; reject: (e: Error) => void };

let worker: Worker | null = null;
let workerBroken = false;
let nextId = 1;
const pending = new Map<number, Pending>();

function failAll(err: Error) {
  for (const p of pending.values()) p.reject(err);
  pending.clear();
}

function getWorker(): Worker | null {
  if (workerBroken || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL("../workers/render.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    workerBroken = true;
    return null;
  }
  worker.onmessage = (e: MessageEvent<{ id: number; result?: RenderResult; error?: string }>) => {
    const p = pending.get(e.data.id);
    if (!p) return;
    pending.delete(e.data.id);
    if (e.data.result) p.resolve(e.data.result);
    else p.reject(new Error(e.data.error || "Render failed"));
  };
  worker.onerror = () => {
    // Module workers can fail to load (old browsers, CSP); stop trying and
    // let the main thread take over from here.
    workerBroken = true;
    worker?.terminate();
    worker = null;
    failAll(new Error("Render worker failed"));
  };
  return worker;
}

/** Renders in the worker, falling back to the main thread if it is unavailable */
export async function renderOffMainThread(input: BrowserRenderInput): Promise<RenderResult> {
  const w = getWorker();
  if (w) {
    try {
      return await new Promise<RenderResult>((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        // Pinia hands us reactive proxies, which structured clone rejects;
        // everything but the Blob is plain JSON data.
        const { photo, ...rest } = input;
        w.postMessage({ id, input: { ...JSON.parse(JSON.stringify(rest)), photo } });
      });
    } catch (err) {
      if (!workerBroken) throw err; // a genuine render error — don't retry it
    }
  }
  return renderInBrowser(input);
}
