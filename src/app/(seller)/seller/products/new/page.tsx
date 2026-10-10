import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ProductForm } from "@/features/seller/components/product-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.products");
  return { title: t("newTitle"), robots: { index: false } };
}

export default async function SellerNewProductPage() {
  const t = await getTranslations("seller.products");
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <ProductForm />
    </main>
  );
}
