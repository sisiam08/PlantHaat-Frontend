import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsStripServer } from "@/features/admin/components/analytics-strip-server";
import { RefundsList } from "@/features/admin/components/refunds-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.refunds");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminRefundsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminRefundsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminRefundsPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.refunds");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader title={t("title")} />
        <AnalyticsStripServer section="refunds" />
        <RefundsList initialStatus={status} initialPage={page} />
      </PageContainer>
    </main>
  );
}
