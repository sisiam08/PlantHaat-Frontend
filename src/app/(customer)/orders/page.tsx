import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { OrdersList } from "@/features/orders/components/orders-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders");
  return { title: t("title"), robots: { index: false } };
}

export default async function OrdersPage() {
  const t = await getTranslations("orders");
  return (
    <PageContainer width="reading">
      <PageHeader title={t("title")} />
      <OrdersList />
    </PageContainer>
  );
}
