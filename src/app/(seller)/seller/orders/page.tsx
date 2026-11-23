import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { ListFallback } from "@/components/dashboard/dashboard-fallback";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { SellerOrdersList } from "@/features/seller/components/seller-orders-list";
import { getSellerOrdersServer, getSellerPanelsServer } from "@/features/seller/server";
import { resolveDashboardRange } from "@/server/dashboard-range";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.orders");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("seller.orders");
  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <Suspense fallback={<ListFallback rows={8} />}>
          <SellerOrdersData searchParams={searchParams} />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function SellerOrdersData({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const range = await resolveDashboardRange("30d");
  const [initialData, initialPanels] = await Promise.all([
    getSellerOrdersServer({ status, page, limit: 20 }),
    getSellerPanelsServer(range),
  ]);

  return (
    <SellerOrdersList
      initialStatus={status}
      initialPage={page}
      initialData={initialData}
      initialPanels={initialPanels}
      initialRange={{ ...range, preset: "30d", compare: true }}
    />
  );
}
