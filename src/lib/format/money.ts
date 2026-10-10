/**
 * Money arrives from the API as a decimal value (often a string). Treat it as
 * opaque; only format for display.
 */
export function formatBdt(value: string | number | null | undefined, locale = "bn"): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-BD", {
    style: "currency",
    currency: "BDT",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function formatPriceRange(
  min: string | number | null | undefined,
  max: string | number | null | undefined,
  locale = "bn",
): string {
  const minStr = formatBdt(min, locale);
  const maxStr = formatBdt(max, locale);
  if (!minStr) {
    return maxStr;
  }
  if (!maxStr || minStr === maxStr) {
    return minStr;
  }
  return `${minStr} – ${maxStr}`;
}
