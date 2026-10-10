import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OrderDetail } from "@/features/admin/components/order-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.orders");
  return { title: t("detailTitle"), robots: { index: false } };
}

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const cancelId = typeof sp.cancel === "string" ? sp.cancel : undefined;
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <OrderDetail id={id} cancelId={cancelId} />
    </main>
  );
}
