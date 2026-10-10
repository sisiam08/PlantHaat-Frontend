import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SellerComplaintsClient } from "@/features/seller/components/seller-complaints-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("seller.complaints");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("seller.complaints");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <SellerComplaintsClient initialStatus={status} initialPage={page} />
    </main>
  );
}
