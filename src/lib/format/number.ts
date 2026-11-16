/**
 * One numeric formatting rule for both locales: Latin digits (owner decision).
 * Bangla text still uses the bn locale, but the numbering system is forced to
 * latn so 7 is always "7", never "৭".
 */
function numberLocale(locale: string): string {
  return locale === "bn" ? "bn-BD-u-nu-latn" : "en-BD";
}

export function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(numberLocale(locale), {
    numberingSystem: "latn",
    maximumFractionDigits: 2,
  }).format(value);
}

/** Inclusive range with Latin digits and an ASCII hyphen: "2-5". */
export function formatRange(min: number, max: number, locale: string): string {
  return `${formatCount(min, locale)}-${formatCount(max, locale)}`;
}
