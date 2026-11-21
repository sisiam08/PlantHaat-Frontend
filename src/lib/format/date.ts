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

/** Relative time in the active locale with Latin digits ("5 minutes ago"). */
export function formatRelativeLatin(
  value: string | number | Date,
  locale: "en" | "bn" | string = "en",
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const formatter = new Intl.RelativeTimeFormat(
    locale === "bn" ? "bn-BD-u-nu-latn" : "en-BD",
    { numeric: "auto" },
  );
  if (abs < 60) return formatter.format(seconds, "second");
  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return formatter.format(months, "month");
  return formatter.format(Math.round(months / 12), "year");
}
