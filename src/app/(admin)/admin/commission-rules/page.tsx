import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsStripServer } from "@/features/admin/components/analytics-strip-server";
import { getTranslations } from "next-intl/server";

import { CommissionRulesClient } from "@/features/admin/components/commission-rules-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.commissionRules");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminCommissionRulesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminCommissionRulesPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminCommissionRulesPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.commissionRules");
  const sp = await searchParams;
  const scope = typeof sp.scope === "string" ? sp.scope : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader title={t("title")} />
        <AnalyticsStripServer section="commission" />
        <CommissionRulesClient initialScope={scope} initialPage={page} />
      </PageContainer>
    </main>
  );
}
