import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { AnnouncementsClient } from "@/features/admin/components/announcements-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.announcements");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminAnnouncementsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminAnnouncementsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminAnnouncementsPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.announcements");
  const sp = await searchParams;
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <AnnouncementsClient initialPage={page} />
    </main>
  );
}
