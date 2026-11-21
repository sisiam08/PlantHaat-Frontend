import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { ProductForm } from "@/features/seller/components/product-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.products");
  return { title: t("newTitle"), robots: { index: false } };
}

export default async function SellerNewProductPage() {
  const t = await getTranslations("seller.products");
  return (
    <main className="flex-1">
      <PageContainer width="form">
        <PageHeader title={t("newTitle")} />
        <ProductForm />
      </PageContainer>
    </main>
  );
}
