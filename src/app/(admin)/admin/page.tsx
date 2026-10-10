import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { DashboardClient } from "@/features/admin/components/dashboard-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.dashboard");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminDashboardPage() {
  const t = await getTranslations("admin.dashboard");
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <DashboardClient />
    </main>
  );
}
