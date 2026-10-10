import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const t = await getTranslations("common");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <span className="rounded-full bg-secondary px-4 py-1.5 text-sm font-medium text-secondary-foreground">
        {t("tagline")}
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        {t("appName")}
      </h1>
      <p className="max-w-md text-muted-foreground">{t("comingSoon")}</p>
      <Button variant="cta" size="lg" disabled>
        {t("comingSoon")}
      </Button>
    </main>
  );
}
