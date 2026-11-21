import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { SellerQuestionsClient } from "@/features/seller/components/seller-questions-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.questions");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerQuestionsPage() {
  const t = await getTranslations("seller.questions");
  return (
    <main className="flex-1">
      <PageContainer width="form">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <SellerQuestionsClient />
      </PageContainer>
    </main>
  );
}
