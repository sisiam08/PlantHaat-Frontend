import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <p className="text-muted-foreground">{t("error")}</p>
      <Button asChild variant="outline">
        <Link href="/">{t("retry")}</Link>
      </Button>
    </main>
  );
}
