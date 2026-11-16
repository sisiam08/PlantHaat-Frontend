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
  const parts = new Intl.NumberFormat(locale === "bn" ? "bn-BD-u-nu-latn" : "en-BD", {
    style: "currency",
    currency: "BDT",
    currencyDisplay: "narrowSymbol",
    numberingSystem: "latn",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).formatToParts(numeric);
  const currency = parts.filter((part) => part.type === "currency");
  const rest = parts.filter((part) => part.type !== "currency");
  while (
    rest.length > 0 &&
    rest[rest.length - 1].type === "literal" &&
    /^\s+$/.test(rest[rest.length - 1].value)
  ) {
    rest.pop();
  }
  return [...currency, ...rest].map((part) => part.value).join("");
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
  return `${minStr} - ${maxStr}`;
}
