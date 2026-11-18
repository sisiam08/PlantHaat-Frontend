import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { CartClient, CartLoading } from "@/features/cart/components/cart-client";
import { getCartServerData } from "@/features/cart/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cart");
  return { title: t("title"), robots: { index: false } };
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartLoading />}>
      <CartContent />
    </Suspense>
  );
}

async function CartContent() {
  const t = await getTranslations("cart");
  const server = await getCartServerData();
  return (
    <PageContainer>
      <PageHeader title={t("title")} />
      <CartClient initialCart={server.cart} signedIn={server.signedIn} />
    </PageContainer>
  );
}
