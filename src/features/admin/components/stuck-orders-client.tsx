"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { Pager } from "./pager";

const PAGE_SIZE = 20;

export function StuckOrdersClient() {
  const t = useTranslations("admin.stuckOrders");
  const tStatus = useTranslations("admin.orderStatus");
  const locale = useLocale();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["admin", "stuck-orders", page],
    queryFn: () => adminApi.listStuckOrders({ page, limit: PAGE_SIZE }),
    retry: false,
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.meta?.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="grid gap-4">
      {query.isLoading ? <Skeleton className="h-48 w-full rounded-2xl" /> : null}
      {query.isError ? (
        <p className="text-sm text-muted-foreground">{t("loadError")}</p>
      ) : null}
      {!query.isLoading && rows.length === 0 ? (
        <Card className="grid place-items-center gap-2 rounded-2xl border-dashed p-10 text-center">
          <Badge variant="secondary" className="rounded-full">
            {t("okBadge")}
          </Badge>
          <p className="font-medium">{t("allClear")}</p>
          <p className="text-sm text-muted-foreground">{t("allClearHint")}</p>
        </Card>
      ) : null}

      {rows.length > 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("order")}</th>
                  <th className="px-3 py-2">{t("shop")}</th>
                  <th className="px-3 py-2">{t("status")}</th>
                  <th className="px-3 py-2">{t("stuckSince")}</th>
                  <th className="px-3 py-2 text-right">{t("reminders")}</th>
                  <th className="px-3 py-2">{t("state")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const since = row.confirmedAt ?? row.createdAt;
                  return (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="px-3 py-2 font-medium">{row.shopOrderNumber}</td>
                      <td className="px-3 py-2">{row.shop?.name ?? "-"}</td>
                      <td className="px-3 py-2">{tStatus(row.status)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {formatDateTime(since, locale)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {row.stuckReminderCount}
                      </td>
                      <td className="px-3 py-2">
                        {row.stuckFlaggedAt ? (
                          <Badge variant="destructive">{t("flagged")}</Badge>
                        ) : (
                          <Badge variant="secondary">{t("watching")}</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link
                          href={`/admin/orders/${row.id}`}
                          className="text-xs text-primary underline-offset-4 hover:underline"
                        >
                          {t("open")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <Pager page={page} totalPages={totalPages} onPage={setPage} />
    </div>
  );
}
