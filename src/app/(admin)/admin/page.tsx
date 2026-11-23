import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { DashboardClient } from "@/features/admin/components/dashboard-client";
import { getAdminPanelsServer, getAdminRecentOrdersServer } from "@/features/admin/server";
import { resolveDashboardRange } from "@/server/dashboard-range";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.dashboard");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin.dashboard");
  const range = await resolveDashboardRange("30d");
  const [initialPanels, initialOrders] = await Promise.all([
    getAdminPanelsServer(range),
    getAdminRecentOrdersServer(5),
  ]);
  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
          actions={
            <>
              <Button asChild variant="outline" size="lg">
                <Link href="/admin/reconciliation">{t("reconciliationTitle")}</Link>
              </Button>
              <Button asChild variant="cta" size="lg">
                <Link href="/admin/orders">{t("orders")}</Link>
              </Button>
            </>
          }
        />
        <DashboardClient
          initialPanels={initialPanels}
          initialOrders={initialOrders}
          initialRange={{ ...range, preset: "30d", compare: true }}
        />
      </PageContainer>
    </main>
  );
}
