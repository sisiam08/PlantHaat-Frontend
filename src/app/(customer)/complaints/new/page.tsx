import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ComplaintNew } from "@/features/complaints/components/complaint-new";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("complaints");
  return { title: t("newTitle"), robots: { index: false } };
}

export default async function NewComplaintPage({
  searchParams,
}: {
  searchParams: Promise<{ shopOrderId?: string }>;
}) {
  const t = await getTranslations("complaints");
  const { shopOrderId } = await searchParams;

  return (
    <PageContainer width="narrow">
      <PageHeader title={t("newTitle")} />
      {shopOrderId ? (
        <ComplaintNew shopOrderId={shopOrderId} />
      ) : (
        <p className="text-sm text-muted-foreground">{t("missingOrder")}</p>
      )}
    </PageContainer>
  );
}
