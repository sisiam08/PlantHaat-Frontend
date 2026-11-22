import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { SellerHealthStripServer } from "@/features/seller/components/seller-health-strip-server";
import { ProductsList } from "@/features/seller/components/products-list";
import { getSellerProductsServer } from "@/features/seller/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.products");
  return { title: t("title"), robots: { index: false } };
}

export default function SellerProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <SellerProductsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function SellerProductsPageBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("seller.products");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const initialData = await getSellerProductsServer();

  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader title={t("title")} />
        <SellerHealthStripServer section="inventory" />
        <ProductsList initialStatus={status} initialPage={page} initialData={initialData} />
      </PageContainer>
    </main>
  );
}
