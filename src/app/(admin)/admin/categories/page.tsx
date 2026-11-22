import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

import { CategoriesClient } from "@/features/admin/components/categories-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.categories");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminCategoriesPage() {
  const t = await getTranslations("admin.categories");
  return (
    <main className="flex-1">
      <PageContainer width="wide">
      <PageHeader title={t("title")} />
      <CategoriesClient />
      </PageContainer>
    </main>
  );
}
