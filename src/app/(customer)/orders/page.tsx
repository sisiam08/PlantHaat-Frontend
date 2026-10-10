import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OrdersList } from "@/features/orders/components/orders-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("orders");
  return { title: t("title"), robots: { index: false } };
}

export default async function OrdersPage() {
  const t = await getTranslations("orders");
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 lg:py-12">
      <h1 className="font-heading text-3xl font-bold">{t("title")}</h1>
      <OrdersList />
    </main>
  );
}
