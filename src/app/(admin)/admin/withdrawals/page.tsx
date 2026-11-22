import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsStripServer } from "@/features/admin/components/analytics-strip-server";
import { getTranslations } from "next-intl/server";

import { WithdrawalsClient } from "@/features/admin/components/withdrawals-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("part4.adminWithdrawals");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminWithdrawalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <AdminWithdrawalsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminWithdrawalsPageBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("part4.adminWithdrawals");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <AnalyticsStripServer section="withdrawals" />
        <WithdrawalsClient initialStatus={status} initialPage={page} />
      </PageContainer>
    </main>
  );
}
