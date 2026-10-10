const TIME_ZONE = "Asia/Dhaka";

export function formatDateTime(value: string | number | Date, locale: string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(date);
}

/** Always renders Latin digits (for order numbers, SKUs, phones). */
export function formatLatinDateTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(date);
}
