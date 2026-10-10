/** Allows only relative, same-origin paths (no scheme, no protocol-relative). */
export function sanitizeReturnTo(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return undefined;
  }
  if (value.includes("://")) {
    return undefined;
  }
  return value;
}
