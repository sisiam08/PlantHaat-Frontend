import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { WishlistClient } from "@/features/wishlist/components/wishlist-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("wishlist");
  return { title: t("title"), robots: { index: false } };
}

export default async function WishlistPage() {
  const t = await getTranslations("wishlist");
  return (
    <PageContainer width="reading">
      <PageHeader title={t("title")} />
      <WishlistClient />
    </PageContainer>
  );
}
