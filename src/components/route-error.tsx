"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * Route-level error UI for critical pages (product detail, cart). Keeps the
 * user in context and offers an in-place retry via `reset()`. Only real
 * not-found responses render `not-found.tsx`; transient failures land here.
 */
export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");
  const te = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="font-heading text-2xl font-semibold text-foreground">{t("error")}</h1>
      <p className="text-muted-foreground">{te("generic")}</p>
      <Button variant="cta" onClick={reset}>
        {t("retry")}
      </Button>
    </div>
  );
}
