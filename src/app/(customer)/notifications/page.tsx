import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { NotificationsClient } from "@/features/notifications/components/notifications-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications");
  return { title: t("title"), robots: { index: false } };
}

export default async function NotificationsPage() {
  const t = await getTranslations("notifications");
  return (
    <main className="mx-auto grid w-full max-w-2xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <NotificationsClient />
    </main>
  );
}
