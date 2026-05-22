/**
 * Returns true if the URL uses a safe http(s) scheme.
 * Rejects javascript:, data:, vbscript:, file:, etc.
 */
export function isSafeUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed);
}

/** Open a URL in a new tab only if it has a safe scheme. */
export function safeOpen(url: string): boolean {
  if (!isSafeUrl(url)) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
