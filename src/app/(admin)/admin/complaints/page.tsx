import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { ListFallback } from "@/components/dashboard/dashboard-fallback";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsStrip } from "@/features/admin/components/analytics-strip";
import { ComplaintsList } from "@/features/admin/components/complaints-list";
import { getAdminComplaintsServer, getAdminPanelsServer } from "@/features/admin/server";
import { resolveDashboardRange } from "@/server/dashboard-range";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.complaints");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("admin.complaints");
  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader
          title={t("title")}
          description={t("subtitle")}
          descriptionClassName="max-w-3xl text-base"
        />
        <Suspense fallback={<ListFallback rows={8} />}>
          <AdminComplaintsData searchParams={searchParams} />
        </Suspense>
      </PageContainer>
    </main>
  );
}

async function AdminComplaintsData({
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
    getAdminComplaintsServer({ status, page, limit: 20 }),
    getAdminPanelsServer(range),
  ]);

  return (
    <>
      <AnalyticsStrip
        section="disputes"
        initialPanels={initialPanels}
        initialRange={{ ...range, preset: "30d", compare: true }}
      />
      <ComplaintsList initialStatus={status} initialPage={page} initialData={initialData} />
    </>
  );
}
