import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { SessionsList } from "@/features/auth/components/sessions-list";

export const metadata: Metadata = {
  title: "Sessions",
  robots: { index: false },
};

export default async function SessionsPage() {
  const t = await getTranslations("auth.sessions");
  return (
    <PageContainer width="form">
      <PageHeader title={t("title")} description={t("subtitle")} />
      <SessionsList />
    </PageContainer>
  );
}
