import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ReconciliationClient } from "@/features/admin/components/reconciliation-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("part4.reconciliation");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminReconciliationPage() {
  const t = await getTranslations("part4.reconciliation");
  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <ReconciliationClient />
      </PageContainer>
    </main>
  );
}
