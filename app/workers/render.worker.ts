import { renderInBrowser, type BrowserRenderInput } from "~/utils/browserRender";

/**
 * Renders off the main thread so a long batch (or a 60MP photo) does not
 * freeze the UI. One message in, one message out, matched by `id`.
 */
self.onmessage = async (e: MessageEvent<{ id: number; input: BrowserRenderInput }>) => {
  const { id, input } = e.data;
  try {
    const result = await renderInBrowser(input);
    (self as unknown as Worker).postMessage({ id, result }, [result.bytes.buffer as ArrayBuffer]);
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
