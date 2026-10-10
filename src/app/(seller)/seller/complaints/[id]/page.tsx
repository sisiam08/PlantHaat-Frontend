import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

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
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-8">
      <SellerComplaintDetail id={id} />
    </main>
  );
}
