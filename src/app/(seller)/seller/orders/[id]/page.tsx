import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

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
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <SellerOrderDetail id={id} />
    </main>
  );
}
