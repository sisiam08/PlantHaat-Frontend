import type { Metadata } from "next";
import { Suspense } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { AnalyticsStripServer } from "@/features/admin/components/analytics-strip-server";
import { getTranslations } from "next-intl/server";

import { UsersList } from "@/features/admin/components/users-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.users");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminUsersPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminUsersPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.users");
  const sp = await searchParams;
  const role = typeof sp.role === "string" ? sp.role : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="flex-1">
      <PageContainer width="wide">
      <PageHeader title={t("title")} />
      <AnalyticsStripServer section="people" />
        <UsersList initialRole={role} initialStatus={status} initialPage={page} />
      </PageContainer>
    </main>
  );
}
