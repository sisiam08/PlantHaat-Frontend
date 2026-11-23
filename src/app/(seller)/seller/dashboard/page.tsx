import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

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
  const range = await resolveDashboardRange("30d");
  const [initialPanels, recentOrders] = await Promise.all([
    getSellerPanelsServer(range),
    getSellerOrdersServer({ page: 1, limit: 5 }),
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
                <Link href="/seller/earnings">{tWallet("title")}</Link>
              </Button>
              <Button asChild variant="cta" size="lg">
                <Link href="/seller/orders">{tOrders("title")}</Link>
              </Button>
            </>
          }
        />
        <DashboardClient
          initialPanels={initialPanels}
          initialOrders={recentOrders?.data}
          initialRange={{ ...range, preset: "30d", compare: true }}
        />
      </PageContainer>
    </main>
  );
}
