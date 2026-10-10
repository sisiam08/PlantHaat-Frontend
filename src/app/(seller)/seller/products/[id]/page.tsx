import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ProductEditor } from "@/features/seller/components/product-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.products");
  return { title: t("editTitle"), robots: { index: false } };
}

export default async function SellerEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("seller.products");
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>
      <ProductEditor id={id} />
    </main>
  );
}
