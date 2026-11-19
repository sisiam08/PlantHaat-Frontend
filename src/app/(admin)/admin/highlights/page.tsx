import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HighlightsClient } from "@/features/admin/components/highlights-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.highlights");
  return { title: t("title"), description: t("subtitle"), robots: { index: false } };
}

export default async function AdminHighlightsPage() {
  const t = await getTranslations("admin.highlights");
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <HighlightsClient />
    </main>
  );
}
