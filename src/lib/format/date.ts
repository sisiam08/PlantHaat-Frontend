const TIME_ZONE = "Asia/Dhaka";

/**
 * The one date/time formatter. Always Latin digits (copy-safe), Asia/Dhaka,
 * with month words in the active UI locale. `formatDateTime` is kept as a
 * thin alias so older call sites keep working without a second implementation.
 */
export function formatLatinDateTime(
  value: string | number | Date,
  locale: "en" | "bn" | string = "en",
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD-u-nu-latn" : "en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "latn",
    timeZone: TIME_ZONE,
  }).format(date);
}

/** @deprecated Use `formatLatinDateTime(value, locale)` instead. */
export function formatDateTime(value: string | number | Date, locale: string): string {
  return formatLatinDateTime(value, locale);
}
