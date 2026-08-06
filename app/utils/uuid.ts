/**
 * Generates a UUID v4 string.
 *
 * `crypto.randomUUID` is only available in secure contexts (HTTPS or
 * http://localhost). When the dev server is reached over plain HTTP via
 * Tailscale MagicDNS (e.g. http://s:3000), it is undefined, so fall back to
 * `crypto.getRandomValues`, which works in any context.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC 4122 version 4 fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0]! & 15) | (c === "x" ? 0 : 8);
    return r.toString(16);
  });
}
