import { getTranslations } from "next-intl/server";

/**
 * Visible non-production marker. The dev database holds real payment numbers,
 * so nobody should mistake a dev checkout/admin screen for a live one.
 */
export async function DevRibbon() {
  if (process.env.NODE_ENV === "production") return null;
  const t = await getTranslations("dev");
  return (
    <div
      role="status"
      data-dev-ribbon
      className="flex flex-wrap items-center justify-center gap-x-2 border-b border-cta/40 bg-cta/15 px-3 py-1.5 text-center text-xs font-medium text-foreground"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-cta" />
      <span className="font-semibold tracking-wide">{t("label")}</span>
      <span className="text-muted-foreground">{t("body")}</span>
    </div>
  );
}
