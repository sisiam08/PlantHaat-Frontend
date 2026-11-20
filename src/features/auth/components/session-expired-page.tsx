"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { useSessionExpired } from "../session-expired-provider";

/**
 * Rendered by /session-expired (proxy rewrite keeps the original URL) or by an
 * unauthorized() boundary. The dialog is already the main UI; this fallback is
 * visible when it cannot render.
 */
export function SessionExpiredPage() {
  const t = useTranslations("auth");
  const { show } = useSessionExpired();

  useEffect(() => {
    show({ canDismiss: false, source: "server" });
  }, [show]);

  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-background px-4 text-center">
      <div className="grid max-w-sm gap-2">
        <p className="font-heading text-lg font-semibold">{t("sessionDialogTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("sessionDialogBody")}</p>
      </div>
    </main>
  );
}
