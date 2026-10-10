import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CategoriesClient } from "@/features/admin/components/categories-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.categories");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminCategoriesPage() {
  const t = await getTranslations("admin.categories");
  return (
    <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <CategoriesClient />
    </main>
  );
}
