import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ContentReportsClient } from "@/features/admin/components/content-reports-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.contentReports");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminContentReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("admin.contentReports");
  const sp = await searchParams;
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const status = typeof sp.status === "string" ? sp.status : "OPEN";

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ContentReportsClient initialPage={page} initialStatus={status} />
    </main>
  );
}
