const ALLOWED_PREFIXES = ["/dashboard", "/admin"];

export function isValidInternalPath(path: string): boolean {
  if (typeof path !== "string" || path.length === 0) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("://")) return false;
  return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
}
