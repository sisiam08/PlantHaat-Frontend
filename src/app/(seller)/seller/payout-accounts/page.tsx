import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { PayoutAccountsClient } from "@/features/seller/components/payout-accounts-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.payouts");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerPayoutAccountsPage() {
  const t = await getTranslations("seller.payouts");
  return (
    <main className="flex-1">
      <PageContainer width="form">
        <PageHeader title={t("title")} />
        <PayoutAccountsClient />
      </PageContainer>
    </main>
  );
}
