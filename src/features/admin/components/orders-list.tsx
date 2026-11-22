"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { BarChart } from "@/components/dashboard/bar-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DataTable, type DataColumn } from "@/components/dashboard/data-table";
import { DateRangePicker, type DateRangeValue } from "@/components/dashboard/date-range-picker";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { KpiSkeleton, TableSkeleton } from "@/components/dashboard/skeletons";
import { presetBounds } from "@/components/dashboard/range";
import { Price } from "@/components/product/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { orderStatusVariant } from "../status";
import type { AdminPanels, AdminShopOrderSummary, OrderStatus } from "../types";
import { Pager } from "./pager";

const PAGE_SIZE = 20;
const FILTERS: ("ALL" | OrderStatus)[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
];
const FUNNEL_ORDER: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
];

function compact(value: string | number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function OrdersList({
  initialStatus,
  initialPage,
  initialData,
  initialPanels,
  initialRange,
}: {
  initialStatus: string;
  initialPage: number;
  initialData?: { data: AdminShopOrderSummary[]; meta?: unknown };
  initialPanels?: AdminPanels;
  initialRange?: DateRangeValue;
}) {
  const t = useTranslations("admin.orders");
  const td = useTranslations("admin.dashboard");
  const tStatus = useTranslations("admin.orderStatus");
  const tCommon = useTranslations("admin.common");
  const tMethod = useTranslations("admin.paymentMethod");
  const tPayment = useTranslations("admin.paymentStatus");
  const locale = useLocale();
  const router = useRouter();
  const [range, setRange] = useState<DateRangeValue>(
    initialRange ?? {
      ...presetBounds("30d"),
      preset: "30d",
      compare: true,
    },
  );

  const status = FILTERS.includes(initialStatus as "ALL" | OrderStatus)
    ? (initialStatus as "ALL" | OrderStatus)
    : "ALL";
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: queryKeys.admin.orders({ status, page, view: "summary" }),
    queryFn: () =>
      adminApi.listOrderSummaries({
        status: status === "ALL" ? undefined : status,
        page,
        limit: PAGE_SIZE,
      }),
    initialData: initialData
      ? { data: initialData.data, meta: initialData.meta as never }
      : undefined,
    retry: false,
  });

  const panels = useQuery({
    queryKey: queryKeys.admin.panels({ from: range.from, to: range.to }),
    queryFn: () => adminApi.panels({ from: range.from, to: range.to }),
    initialData: initialPanels,
    retry: false,
  });

  const go = (nextStatus: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/admin/orders?${qs}` : "/admin/orders");
  };

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  const statusCounts = new Map(
    (panels.data?.ordersByStatus ?? []).map((row) => [row.key, row.count]),
  );
  const statusLabels = FUNNEL_ORDER.map((entry) => tStatus(entry));
  const statusValues = FUNNEL_ORDER.map((entry) => statusCounts.get(entry) ?? 0);
  const statusTotal = statusValues.reduce((sum, value) => sum + value, 0);

  const columns: DataColumn<AdminShopOrderSummary>[] = [
    {
      key: "order",
      header: t("title"),
      render: (row) => (
        <Link href={`/admin/orders/${row.id}`} className="font-medium hover:underline">
          {row.shopOrderNumber}
          <span className="block text-xs font-normal text-muted-foreground">
            {row.order.orderNumber}
          </span>
        </Link>
      ),
      sortValue: (row) => row.shopOrderNumber,
    },
    {
      key: "shop",
      header: t("shop"),
      render: (row) => row.shop.name,
      sortValue: (row) => row.shop.name,
      cardHidden: true,
    },
    {
      key: "items",
      header: t("items"),
      align: "end",
      render: (row) => row.items.length,
      sortValue: (row) => row.items.length,
      cardHidden: true,
    },
    {
      key: "payment",
      header: t("payment"),
      render: (row) => (
        <span className="grid gap-1">
          <span className="text-xs">{tMethod(row.order.paymentMethod as never)}</span>
          <Badge variant="outline" className="w-fit text-[10px]">
            {tPayment(row.order.paymentStatus as never)}
          </Badge>
        </span>
      ),
      sortValue: (row) => row.order.paymentMethod,
      cardHidden: true,
    },
    {
      key: "total",
      header: t("total"),
      align: "end",
      render: (row) => <Price value={row.total} locale={locale} size="sm" />,
      sortValue: (row) => compact(row.total),
    },
    {
      key: "status",
      header: t("status"),
      render: (row) => (
        <Badge variant={orderStatusVariant(row.status)}>{tStatus(row.status)}</Badge>
      ),
      sortValue: (row) => row.status,
    },
    {
      key: "created",
      header: t("created"),
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatLatinDateTime(row.createdAt, locale)}
        </span>
      ),
      sortValue: (row) => row.createdAt,
      cardHidden: true,
    },
    {
      key: "action",
      header: tCommon("actions"),
      render: (row) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/orders/${row.id}`}>{t("view")}</Link>
        </Button>
      ),
      cardHidden: true,
    },
  ];

  const kpis = panels.data?.kpis;

  return (
    <div className="grid grid-cols-1 min-w-0 gap-5">
      <DateRangePicker
        value={range}
        onChange={setRange}
        labels={{
          period: td("period"),
          today: td("today"),
          days7: td("days7"),
          days30: td("days30"),
          days90: td("days90"),
          custom: td("custom"),
          from: td("from"),
          to: td("to"),
          compare: td("compare"),
        }}
      />

      <div
        role="region"
        aria-label={td("orders")}
        tabIndex={0}
        className="flex min-w-0 snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-5"
      >
        {panels.isLoading || !kpis ? (
          Array.from({ length: 5 }, (_, index) => (
            <KpiSkeleton key={index} className="min-w-[15rem] snap-start sm:min-w-0" />
          ))
        ) : (
          <>
            <KpiCard
              className="min-w-[15rem] snap-start sm:min-w-0"
              label={td("orders")}
              value={kpis.orders.current}
              delta={
                range.compare
                  ? {
                      value: kpis.orders.deltaPct,
                      meaning: "neutral",
                      label: td("previous"),
                    }
                  : undefined
              }
              sparkline={(panels.data?.series ?? []).map((point) => point.orders)}
            />
            <KpiCard
              className="min-w-[15rem] snap-start sm:min-w-0"
              label={td("gmv")}
              value={<Price value={kpis.gmv.current} locale={locale} size="lg" />}
              delta={
                range.compare
                  ? { value: kpis.gmv.deltaPct, meaning: "good", label: td("previous") }
                  : undefined
              }
              sparkline={(panels.data?.series ?? []).map((point) => compact(point.gmv))}
            />
            <KpiCard
              className="min-w-[15rem] snap-start sm:min-w-0"
              label={td("aov")}
              value={<Price value={kpis.aov.current} locale={locale} size="lg" />}
              delta={
                range.compare
                  ? { value: kpis.aov.deltaPct, meaning: "neutral", label: td("previous") }
                  : undefined
              }
            />
            <KpiCard
              className="min-w-[15rem] snap-start sm:min-w-0"
              label={td("deliveredOrders")}
              value={kpis.deliveredOrders.current}
              delta={
                range.compare
                  ? {
                      value: kpis.deliveredOrders.deltaPct,
                      meaning: "good",
                      label: td("previous"),
                    }
                  : undefined
              }
              sparkline={(panels.data?.series ?? []).map((point) => point.delivered)}
            />
            <KpiCard
              className="min-w-[15rem] snap-start sm:min-w-0"
              label={td("commission")}
              value={<Price value={kpis.commission.current} locale={locale} size="lg" />}
              delta={
                range.compare
                  ? {
                      value: kpis.commission.deltaPct,
                      meaning: "good",
                      label: td("previous"),
                    }
                  : undefined
              }
            />
          </>
        )}
      </div>

      <ChartCard
        title={td("ordersByStatus")}
        subtitle={td("period")}
        summary={td("summaryStatus", { total: statusTotal, count: FUNNEL_ORDER.length })}
        labels={{
          viewData: td("viewData"),
          viewChart: td("viewChart"),
          exportCsv: td("exportCsv"),
        }}
        loading={panels.isLoading}
        error={
          panels.isError
            ? {
                message: td("noDataPeriod"),
                retryLabel: td("retry"),
                onRetry: () => void panels.refetch(),
              }
            : undefined
        }
        empty={
          !panels.isLoading && statusTotal === 0
            ? { message: td("noDataPeriod") }
            : undefined
        }
        table={{
          columns: [
            { key: "status", label: t("status") },
            { key: "count", label: t("items"), align: "end" },
          ],
          rows: FUNNEL_ORDER.map((entry) => ({
            status: tStatus(entry),
            count: statusCounts.get(entry) ?? 0,
          })),
        }}
        csvName="orders-by-status"
      >
        <BarChart
          orientation="horizontal"
          summary={td("summaryStatus", { total: statusTotal, count: FUNNEL_ORDER.length })}
          labels={statusLabels}
          series={[{ key: "count", label: t("items"), values: statusValues, colorIndex: 0 }]}
        />
      </ChartCard>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={status === filter ? "secondary" : "ghost"}
            onClick={() => go(filter, 1)}
          >
            {filter === "ALL" ? tCommon("all") : tStatus(filter)}
          </Button>
        ))}
      </div>

      {query.isLoading ? <TableSkeleton rows={6} /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && !query.isError ? (
        <DataTable
          caption={t("title")}
          emptyText={t("empty")}
          getRowKey={(row) => row.id}
          columns={columns}
          rows={items}
          labels={{ density: tCommon("density"), sortBy: tCommon("sortBy") }}
        />
      ) : null}

      {meta ? (
        <Pager page={meta.page} totalPages={meta.totalPages} onPage={(p) => go(status, p)} />
      ) : null}
    </div>
  );
}
