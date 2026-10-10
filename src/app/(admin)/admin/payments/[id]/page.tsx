import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PaymentDetail } from "@/features/admin/components/payment-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.payments");
  return { title: t("detailTitle"), robots: { index: false } };
}

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <PaymentDetail id={id} />
    </main>
  );
}
