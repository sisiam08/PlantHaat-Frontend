import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";

import { SellerOrderDetail } from "@/features/seller/components/seller-order-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.orders");
  return { title: t("detailTitle"), robots: { index: false } };
}

export default async function SellerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="flex-1">
      <PageContainer width="form">
        <SellerOrderDetail id={id} />
      </PageContainer>
    </main>
  );
}
