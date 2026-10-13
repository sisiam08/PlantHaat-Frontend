/** Localized integer formatting: Bangla digits in bn, Latin in en. */
export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-BD").format(value);
}

/** Localized inclusive range, e.g. "৩–৫" / "3–5". */
export function formatRange(min: number, max: number, locale: string): string {
  return `${formatCount(min, locale)}–${formatCount(max, locale)}`;
}
