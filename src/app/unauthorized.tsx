import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Cheap fallback for segments without a dedicated unauthorized boundary. The
 * full dialog lives in the protected groups' unauthorized.tsx and in the proxy
 * rewrite to /session-expired.
 */
export default async function Unauthorized() {
  const t = await getTranslations("auth");
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-background px-4 text-center">
      <div className="grid max-w-sm gap-3">
        <p className="font-heading text-lg font-semibold">{t("sessionDialogTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("sessionDialogBody")}</p>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          {t("signIn")}
        </Link>
      </div>
    </main>
  );
}
