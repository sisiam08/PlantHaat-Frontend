import type { Metadata } from "next";

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
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <OrderDetail orderId={id} />
    </main>
  );
}
