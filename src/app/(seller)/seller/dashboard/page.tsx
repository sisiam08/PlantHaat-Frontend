import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { DashboardClient } from "@/features/seller/components/dashboard-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.dashboard");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerDashboardPage() {
  const t = await getTranslations("seller.dashboard");
  return (
    <main className="flex-1">
      <PageContainer width="reading">
        <PageHeader title={t("title")} />
        <DashboardClient />
      </PageContainer>
    </main>
  );
}
