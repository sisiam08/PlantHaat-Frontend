import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SettingsClient } from "@/features/admin/components/settings-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.settings");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminSettingsPage() {
  const t = await getTranslations("admin.settings");
  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <SettingsClient />
    </main>
  );
}
