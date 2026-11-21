import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { ShopClient } from "@/features/seller/components/shop-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.shop");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerShopPage() {
  const t = await getTranslations("seller.shop");
  return (
    <main className="flex-1">
      <PageContainer width="form">
        <PageHeader title={t("title")} />
        <ShopClient />
      </PageContainer>
    </main>
  );
}
