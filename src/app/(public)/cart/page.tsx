import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CartClient } from "@/features/cart/components/cart-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("title"), robots: { index: false } };
}

export default async function CartPage() {
  const t = await getTranslations("cart");
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <CartClient />
    </main>
  );
}
