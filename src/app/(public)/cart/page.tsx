import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
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
    <PageContainer>
      <PageHeader title={t("title")} />
      <CartClient />
    </PageContainer>
  );
}
