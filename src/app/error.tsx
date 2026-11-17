"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    // Surface to the console for debugging; never render raw errors to users.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">{t("error")}</h1>
      <p className="text-muted-foreground">{t("errorBody")}</p>
      <Button variant="cta" onClick={reset}>
        {t("retry")}
      </Button>
    </main>
  );
}
