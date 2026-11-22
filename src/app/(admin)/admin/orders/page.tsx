import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { presetBounds } from "@/components/dashboard/range";
import { OrdersList } from "@/features/admin/components/orders-list";
import { getAdminPanelsServer } from "@/features/admin/server";
import type { AdminShopOrderSummary } from "@/features/admin/types";
import { serverGet } from "@/server/backend";
import { readAuthCookies } from "@/server/cookies";

const PAGE_SIZE = 20;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.orders");
  return { title: t("title"), robots: { index: false } };
}

export default function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={null}>
      <AdminOrdersPageBody searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminOrdersPageBody({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("admin.orders");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "";
  const pageRaw = typeof sp.page === "string" ? Number(sp.page) : 1;
  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  // First paint from the server: the admin list's LCP was the table text that
  // arrived only after a client fetch. The summary projection + server fetch
  // removes that round trip; the client query seeds from it and stays live.
  const range = presetBounds("30d");
  const [initialData, initialPanels] = await Promise.all([
    (async (): Promise<{ data: AdminShopOrderSummary[]; meta?: unknown } | undefined> => {
      const token = (await readAuthCookies()).accessToken;
      if (!token) return undefined;
      const params = new URLSearchParams({
        view: "summary",
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (status && status !== "ALL") params.set("status", status);
      try {
        const result = await serverGet<AdminShopOrderSummary[]>(
          `/admin/orders?${params.toString()}`,
          { token },
        );
        return { data: result.data, meta: result.meta };
      } catch {
        return undefined;
      }
    })(),
    getAdminPanelsServer(range),
  ]);

  return (
    <main className="flex-1">
      <PageContainer width="wide">
        <PageHeader title={t("title")} description={t("subtitle")} />
        <OrdersList
          initialStatus={status}
          initialPage={page}
          initialData={initialData}
          initialPanels={initialPanels}
          initialRange={{ ...range, preset: "30d", compare: true }}
        />
      </PageContainer>
    </main>
  );
}
