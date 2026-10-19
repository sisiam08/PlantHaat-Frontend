import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { SellersList } from "@/features/admin/components/sellers-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.sellers");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminSellersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminSellersPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminSellersPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.sellers");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <SellersList initialStatus={status} initialPage={page} />
    </main>
  );
}
