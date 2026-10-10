/**
 * Normalizes the catch-all path segments from `/api/v1/[...path]` and rejects
 * anything that is not a plain relative path (traversal, absolute URLs, etc.).
 */
export function normalizeApiPath(segments: string[]): string | null {
  if (segments.length === 0) {
    return null;
  }
  for (const segment of segments) {
    if (
      segment.length === 0 ||
      segment === "." ||
      segment === ".." ||
      segment.includes("/") ||
      segment.includes("\\")
    ) {
      return null;
    }
  }
  const joined = `/${segments.join("/")}`;
  let decoded: string;
  try {
    decoded = decodeURIComponent(joined);
  } catch {
    return null;
  }
  if (decoded.includes("..") || decoded.includes("://") || decoded.startsWith("//")) {
    return null;
  }
  return decoded;
}
