import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { SellerReviewsClient } from "@/features/seller/components/seller-reviews-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.reviews");
  return { title: t("title"), robots: { index: false } };
}

export default function SellerReviewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <SellerReviewsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function SellerReviewsPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("seller.reviews");
  const sp = await searchParams;
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <SellerReviewsClient initialPage={page} />
    </main>
  );
}
