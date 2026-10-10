import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CheckoutClient } from "@/features/checkout/components/checkout-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("checkout");
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage() {
  const t = await getTranslations("checkout");
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 lg:py-12">
      <h1 className="font-heading text-3xl font-bold">{t("title")}</h1>
      <CheckoutClient />
    </main>
  );
}
