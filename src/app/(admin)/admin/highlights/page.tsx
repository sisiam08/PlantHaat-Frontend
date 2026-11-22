import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { HighlightsClient } from "@/features/admin/components/highlights-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.highlights");
  return { title: t("title"), description: t("subtitle"), robots: { index: false } };
}

export default async function AdminHighlightsPage() {
  const t = await getTranslations("admin.highlights");
  return (
    <main className="flex-1">
      <PageContainer width="wide">
      <div className="grid gap-1">
        <PageHeader title={t("title")} />
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <HighlightsClient />
      </PageContainer>
    </main>
  );
}
