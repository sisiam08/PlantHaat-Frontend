import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ComplaintsClient } from "@/features/complaints/components/complaints-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("complaints");
  return { title: t("title"), robots: { index: false } };
}

export default async function ComplaintsPage() {
  const t = await getTranslations("complaints");
  return (
    <PageContainer width="narrow">
      <PageHeader title={t("title")} />
      <ComplaintsClient />
    </PageContainer>
  );
}
