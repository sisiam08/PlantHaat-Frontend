import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { OrderDetail } from "@/features/orders/components/order-detail";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageContainer width="reading">
      <OrderDetail orderId={id} />
    </PageContainer>
  );
}
