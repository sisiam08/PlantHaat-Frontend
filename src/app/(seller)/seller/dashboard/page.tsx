import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { DashboardFallback } from "@/components/dashboard/dashboard-fallback";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

import { DashboardClient } from "@/features/seller/components/dashboard-client";
import { getSellerOrdersServer, getSellerPanelsServer } from "@/features/seller/server";
import { resolveDashboardRange } from "@/server/dashboard-range";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.dashboard");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerDashboardPage() {
  const t = await getTranslations("seller.dashboard");
  const tOrders = await getTranslations("seller.orders");
  const tWallet = await getTranslations("part4.wallet");
  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
          actions={
            <>
              <Button asChild variant="outline" size="lg">
                <Link href="/seller/earnings">{tWallet("title")}</Link>
              </Button>
              <Button asChild variant="cta" size="lg">
                <Link href="/seller/orders">{tOrders("title")}</Link>
              </Button>
            </>
          }
        />
        <Suspense fallback={<DashboardFallback />}>
          <SellerDashboardData />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function SellerDashboardData() {
  const range = await resolveDashboardRange("30d");
  const [initialPanels, recentOrders] = await Promise.all([
    getSellerPanelsServer(range),
    getSellerOrdersServer({ page: 1, limit: 5 }),
  ]);
  return (
    <DashboardClient
      initialPanels={initialPanels}
      initialOrders={recentOrders?.data}
      initialRange={{ ...range, preset: "30d", compare: true }}
    />
  );
}
