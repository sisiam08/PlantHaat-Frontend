import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { ComplaintDetail } from "@/features/complaints/components/complaint-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("complaints");
  return { title: t("title"), robots: { index: false } };
}

export default async function ComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageContainer width="narrow">
      <ComplaintDetail id={id} />
    </PageContainer>
  );
}
