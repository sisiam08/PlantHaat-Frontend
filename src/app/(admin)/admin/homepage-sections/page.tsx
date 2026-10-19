import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { HomepageSectionsClient } from "@/features/admin/components/homepage-sections-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.homepageSections");
  return { title: t("title"), robots: { index: false } };
}

export default async function AdminHomepageSectionsPage() {
  const t = await getTranslations("admin.homepageSections");
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {t("codeNotice")}
        </p>
      </div>
      <HomepageSectionsClient />
    </main>
  );
}
