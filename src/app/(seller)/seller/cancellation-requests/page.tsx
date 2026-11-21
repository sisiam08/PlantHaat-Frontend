import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { CancellationRequestsClient } from "@/features/seller/components/cancellation-requests-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.cancellations");
  return { title: t("title"), robots: { index: false } };
}

export default function SellerCancellationRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <SellerCancellationRequestsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function SellerCancellationRequestsPageBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("seller.cancellations");
  const sp = await searchParams;
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="flex-1">
      <PageContainer width="reading">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <CancellationRequestsClient initialPage={page} />
      </PageContainer>
    </main>
  );
}
