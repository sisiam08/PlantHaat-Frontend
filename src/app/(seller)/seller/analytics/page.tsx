import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AnalyticsClient } from "@/features/seller/components/analytics-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.analytics");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerAnalyticsPage() {
  const t = await getTranslations("seller.analytics");
  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <AnalyticsClient />
    </main>
  );
}
