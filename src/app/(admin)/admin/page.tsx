import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardClient } from "@/features/admin/components/dashboard-client";
import { getAdminPanelsServer } from "@/features/admin/server";
import { resolveDashboardRange } from "@/server/dashboard-range";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.dashboard");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin.dashboard");
  const range = await resolveDashboardRange("30d");
  const initialPanels = await getAdminPanelsServer(range);
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
