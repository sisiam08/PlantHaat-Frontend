import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { CommissionRulesClient } from "@/features/admin/components/commission-rules-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.commissionRules");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminCommissionRulesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminCommissionRulesPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminCommissionRulesPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.commissionRules");
  const sp = await searchParams;
  const scope = typeof sp.scope === "string" ? sp.scope : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <CommissionRulesClient initialScope={scope} initialPage={page} />
    </main>
  );
}
