import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { SettingsClient } from "@/features/admin/components/settings-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.settings");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminSettingsPage() {
  const t = await getTranslations("admin.settings");
  return (
    <main className="flex-1">
      <PageContainer width="reading">
      <PageHeader title={t("title")} />
      <SettingsClient />
      </PageContainer>
    </main>
  );
}
