import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { AuditLogsClient } from "@/features/admin/components/audit-logs-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.auditLogs");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminAuditLogsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={null}>
      <AdminAuditLogsPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminAuditLogsPageBody({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = await getTranslations("admin.auditLogs");
  const sp = await searchParams;
  const entityType = typeof sp.entityType === "string" ? sp.entityType : "";
  const action = typeof sp.action === "string" ? sp.action : "";
  const actorId = typeof sp.actorId === "string" ? sp.actorId : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <AuditLogsClient
        initialEntityType={entityType}
        initialAction={action}
        initialActorId={actorId}
        initialPage={page}
      />
    </main>
  );
}
