import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { DashboardClient } from "@/features/seller/components/dashboard-client";
import { getSellerPanelsServer } from "@/features/seller/server";
import { resolveDashboardRange } from "@/server/dashboard-range";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.dashboard");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerDashboardPage() {
  const t = await getTranslations("seller.dashboard");
  const range = await resolveDashboardRange("30d");
  const initialPanels = await getSellerPanelsServer(range);
  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <DashboardClient
          initialPanels={initialPanels}
          initialRange={{ ...range, preset: "30d", compare: true }}
        />
      </PageContainer>
    </main>
  );
}
