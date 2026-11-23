import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsStripServer } from "@/features/admin/components/analytics-strip-server";
import { getTranslations } from "next-intl/server";

import { ProductsModeration } from "@/features/admin/components/products-moderation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.products");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminProductsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminProductsPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.products");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="flex-1">
      <PageContainer width="wide">
      <PageHeader title={t("title")} />
      <AnalyticsStripServer section="inventory" />
        <ProductsModeration initialStatus={status} initialPage={page} />
      </PageContainer>
    </main>
  );
}
