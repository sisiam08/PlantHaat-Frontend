import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { PayoutsClient } from "@/features/admin/components/payouts-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.payouts");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminPayoutsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminPayoutsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminPayoutsPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.payouts");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <PayoutsClient initialStatus={status} initialPage={page} />
    </main>
  );
}
