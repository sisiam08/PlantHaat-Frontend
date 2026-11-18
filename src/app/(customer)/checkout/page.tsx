import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getCheckoutServerData } from "@/features/cart/server";
import { CheckoutClient } from "@/features/checkout/components/checkout-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage() {
  const t = await getTranslations("checkout");
  const server = await getCheckoutServerData();
  return (
    <PageContainer>
      <PageHeader title={t("title")} />
      <CheckoutClient initial={server} />
    </PageContainer>
  );
}
