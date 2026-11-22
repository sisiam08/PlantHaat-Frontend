import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { HomepageSectionsClient } from "@/features/admin/components/homepage-sections-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.homepageSections");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminHomepageSectionsPage() {
  const t = await getTranslations("admin.homepageSections");
  return (
    <main className="flex-1">
      <PageContainer width="reading">
      <div className="grid gap-1">
        <PageHeader title={t("title")} />
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {t("codeNotice")}
        </p>
      </div>
      <HomepageSectionsClient />
      </PageContainer>
    </main>
  );
}
