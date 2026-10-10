import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { EarningsClient } from "@/features/seller/components/earnings-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.earnings");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerEarningsPage() {
  const t = await getTranslations("seller.earnings");
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <EarningsClient />
    </main>
  );
}
