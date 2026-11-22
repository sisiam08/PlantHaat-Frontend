import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { presetBounds } from "@/components/dashboard/range";

import { SellerOrdersList } from "@/features/seller/components/seller-orders-list";
import { getSellerOrdersServer, getSellerPanelsServer } from "@/features/seller/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.orders");
  return { title: t("title"), robots: { index: false } };
}

export default function SellerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <SellerOrdersPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function SellerOrdersPageBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("seller.orders");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const range = presetBounds("30d");
  const [initialData, initialPanels] = await Promise.all([
    getSellerOrdersServer({ status, page, limit: 20 }),
    getSellerPanelsServer(range),
  ]);

  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader title={t("title")} />
        <SellerOrdersList
          initialStatus={status}
          initialPage={page}
          initialData={initialData}
          initialPanels={initialPanels}
          initialRange={{ ...range, preset: "30d", compare: true }}
        />
      </PageContainer>
    </main>
  );
}
