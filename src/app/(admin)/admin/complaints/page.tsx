import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { presetBounds } from "@/components/dashboard/range";
import { AnalyticsStrip } from "@/features/admin/components/analytics-strip";
import { ComplaintsList } from "@/features/admin/components/complaints-list";
import { getAdminComplaintsServer, getAdminPanelsServer } from "@/features/admin/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.complaints");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminComplaintsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminComplaintsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminComplaintsPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.complaints");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const range = presetBounds("30d");
  const [initialData, initialPanels] = await Promise.all([
    getAdminComplaintsServer({ status, page, limit: 20 }),
    getAdminPanelsServer(range),
  ]);

  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader title={t("title")} />
        <AnalyticsStrip
          section="disputes"
          initialPanels={initialPanels}
          initialRange={{ ...range, preset: "30d", compare: true }}
        />
        <ComplaintsList initialStatus={status} initialPage={page} initialData={initialData} />
      </PageContainer>
    </main>
  );
}
