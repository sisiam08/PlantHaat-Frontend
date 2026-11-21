import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { WalletClient } from "@/features/seller/components/wallet-client";
import { getPublicSettings } from "@/server/public-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("part4.wallet");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerEarningsPage() {
  const t = await getTranslations("part4.wallet");
  const settings = await getPublicSettings();
  return (
    <main className="flex-1">
      <PageContainer width="reading">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <WalletClient windowHours={settings["return.windowHours"]} />
      </PageContainer>
    </main>
  );
}
