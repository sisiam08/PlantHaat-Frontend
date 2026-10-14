import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageLoading } from "@/components/layout/page-skeleton";
import { CartClient } from "@/features/cart/components/cart-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("title"), robots: { index: false } };
}

export default function CartPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CartContent />
    </Suspense>
  );
}

async function CartContent() {
  const t = await getTranslations("cart");
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 lg:py-12">
      <h1 className="font-heading text-3xl font-bold">{t("title")}</h1>
      <CartClient />
    </main>
  );
}
