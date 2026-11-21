import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { SellerComplaintsClient } from "@/features/seller/components/seller-complaints-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.complaints");
  return { title: t("title"), robots: { index: false } };
}

export default function SellerComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <SellerComplaintsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function SellerComplaintsPageBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("seller.complaints");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="flex-1">
      <PageContainer width="reading">
        <PageHeader title={t("title")} />
        <SellerComplaintsClient initialStatus={status} initialPage={page} />
      </PageContainer>
    </main>
  );
}
