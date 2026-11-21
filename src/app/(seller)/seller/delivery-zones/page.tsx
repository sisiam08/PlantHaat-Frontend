import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { DeliveryZonesClient } from "@/features/seller/components/delivery-zones-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.zones");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerDeliveryZonesPage() {
  const t = await getTranslations("seller.zones");
  return (
    <main className="flex-1">
      <PageContainer width="form">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <DeliveryZonesClient />
      </PageContainer>
    </main>
  );
}
