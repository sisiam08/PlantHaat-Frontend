import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getTranslations } from "next-intl/server";

import { ReviewReportsClient } from "@/features/admin/components/review-reports-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.reviewReports");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminReviewReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminReviewReportsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminReviewReportsPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.reviewReports");
  const sp = await searchParams;
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="flex-1">
      <PageContainer width="reading">
      <PageHeader title={t("title")} />
      <ReviewReportsClient initialPage={page} />
      </PageContainer>
    </main>
  );
}
