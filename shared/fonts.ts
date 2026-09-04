/**
 * Self-hosted font faces that takumi's built-in Google catalog does not know
 * (e.g. LXGW WenKai). Relative paths work for the browser WASM renderer and
 * for DOM @font-face; the server normalizes them to absolute URLs before
 * handing them to takumi.
 */
export const SELF_HOSTED_FONT_PATHS = ["/fonts/LXGWWenKai-Regular.ttf"] as const;
