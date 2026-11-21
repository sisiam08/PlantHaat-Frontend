import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";

import { SellerComplaintDetail } from "@/features/seller/components/seller-complaint-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.complaints");
  return { title: t("detailTitle"), robots: { index: false } };
}

export default async function SellerComplaintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex-1">
      <PageContainer width="narrow">
        <SellerComplaintDetail id={id} />
      </PageContainer>
    </main>
  );
}
