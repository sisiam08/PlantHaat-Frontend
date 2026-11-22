import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { StuckOrdersClient } from "@/features/admin/components/stuck-orders-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.stuckOrders");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminStuckOrdersPage() {
  const t = await getTranslations("admin.stuckOrders");
  return (
    <main className="flex-1">
      <PageContainer width="wide">
      <div className="grid gap-1">
        <PageHeader title={t("title")} />
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <StuckOrdersClient />
      </PageContainer>
    </main>
  );
}
