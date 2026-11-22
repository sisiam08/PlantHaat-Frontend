import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { CodRiskClient } from "@/features/admin/components/cod-risk-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.codRisk");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminCodRiskPage() {
  const t = await getTranslations("admin.codRisk");
  return (
    <main className="flex-1">
      <PageContainer width="wide">
      <div className="grid gap-1">
        <PageHeader title={t("title")} />
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CodRiskClient />
      </PageContainer>
    </main>
  );
}
