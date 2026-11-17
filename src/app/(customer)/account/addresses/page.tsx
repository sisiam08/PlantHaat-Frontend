import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AddressesClient } from "@/features/account/components/addresses-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.addresses");
  return { title: t("title"), robots: { index: false } };
}

export default async function AddressesPage() {
  const t = await getTranslations("account.addresses");
  return (
    <PageContainer width="form">
      <PageHeader title={t("title")} />
      <AddressesClient />
    </PageContainer>
  );
}
