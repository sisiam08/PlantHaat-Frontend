import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AccountClient } from "@/features/account/components/account-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account");
  return { title: t("title"), robots: { index: false } };
}

export default async function AccountPage() {
  const t = await getTranslations("account");
  return (
    <PageContainer width="narrow">
      <PageHeader title={t("title")} />
      <AccountClient />
    </PageContainer>
  );
}
