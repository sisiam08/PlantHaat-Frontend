"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("common");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="text-muted-foreground">{t("error")}</p>
      <Button asChild variant="outline">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </main>
  );
}
