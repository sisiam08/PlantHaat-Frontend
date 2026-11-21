import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { AnalyticsClient } from "@/features/seller/components/analytics-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.analytics");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerAnalyticsPage() {
  const t = await getTranslations("seller.analytics");
  return (
    <main className="flex-1">
      <PageContainer width="reading">
        <PageHeader title={t("title")} />
        <AnalyticsClient />
      </PageContainer>
    </main>
  );
}
