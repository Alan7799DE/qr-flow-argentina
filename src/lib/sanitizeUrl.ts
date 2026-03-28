/**
 * Validates that a URL is safe for internal use (only http/https, no control chars).
 * Returns the sanitized URL string or null if invalid.
 */
export function sanitizeUrl(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Reject control characters (U+0000–U+001F, U+007F)
  if (/[\x00-\x1f\x7f]/i.test(trimmed)) return null;

  // Reject protocol-relative URLs
  if (trimmed.startsWith("//")) return null;

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();

    // Only allow http and https
    if (protocol !== "http:" && protocol !== "https:") return null;

    return parsed.toString();
  } catch {
    return null;
  }
}
