import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { WishlistClient } from "@/features/wishlist/components/wishlist-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("wishlist");
  return { title: t("title"), robots: { index: false } };
}

export default async function WishlistPage() {
  const t = await getTranslations("wishlist");
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <WishlistClient />
    </main>
  );
}
