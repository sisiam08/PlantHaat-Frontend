import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

export const LOCALE_COOKIE = "NEXT_LOCALE";
export const locales = ["bn", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "bn";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = cookieLocale === "en" ? "en" : defaultLocale;

  return {
    locale,
    // One timezone for server + client so date markup cannot diverge between
    // SSR and hydration (design §5: dates render in Asia/Dhaka).
    timeZone: "Asia/Dhaka",
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
