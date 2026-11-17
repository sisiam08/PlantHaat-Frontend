import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationsClient } from "@/features/notifications/components/notifications-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("notifications");
  return { title: t("title"), robots: { index: false } };
}

export default async function NotificationsPage() {
  const t = await getTranslations("notifications");
  return (
    <PageContainer width="narrow">
      <PageHeader title={t("title")} />
      <NotificationsClient />
    </PageContainer>
  );
}
