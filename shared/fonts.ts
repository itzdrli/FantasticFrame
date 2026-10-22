/**
 * Self-hosted font faces that takumi's built-in Google catalog does not know
 * (e.g. LXGW WenKai). Relative paths work for the browser WASM renderer and
 * for DOM @font-face; the server normalizes them to absolute URLs before
 * handing them to takumi.
 */
export const SELF_HOSTED_FONT_PATHS = ["/fonts/LXGWWenKai-Regular.ttf"] as const;

const FONT_PATH_RE = /^\/fonts\/[\w\-./]+\.(?:ttf|otf|woff2?)$/i;

/**
 * Whether `path` is an acceptable client-supplied font reference: a same-site
 * "/fonts/..." file. Anything else (absolute URLs, "//host", "..") is rejected
 * because the server fetches these, so accepting them would be an SSRF.
 */
export function isAllowedFontPath(path: unknown): path is string {
  return typeof path === "string" && FONT_PATH_RE.test(path) && !path.includes("..");
}
