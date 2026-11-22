import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getTranslations } from "next-intl/server";

import { ContentReportsClient } from "@/features/admin/components/content-reports-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.contentReports");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminContentReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminContentReportsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminContentReportsPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.contentReports");
  const sp = await searchParams;
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const status = typeof sp.status === "string" ? sp.status : "OPEN";

  return (
    <main className="flex-1">
      <PageContainer width="reading">
      <div className="grid gap-1">
        <PageHeader title={t("title")} />
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ContentReportsClient initialPage={page} initialStatus={status} />
      </PageContainer>
    </main>
  );
}
