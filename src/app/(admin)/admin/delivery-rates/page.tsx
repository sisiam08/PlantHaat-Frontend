import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { DeliveryRatesClient } from "@/features/admin/components/delivery-rates-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.deliveryRates");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminDeliveryRatesPage() {
  const t = await getTranslations("admin.deliveryRates");
  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <div className="grid gap-1">
          <PageHeader title={t("title")} />
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <DeliveryRatesClient />
      </PageContainer>
    </main>
  );
}
