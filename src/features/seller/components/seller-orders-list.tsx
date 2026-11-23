"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Price } from "@/components/product/price";

import { BarChart } from "@/components/dashboard/bar-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DataTable, type DataColumn } from "@/components/dashboard/data-table";
import { DateRangePicker, type DateRangeValue } from "@/components/dashboard/date-range-picker";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { KpiSkeleton, TableSkeleton } from "@/components/dashboard/skeletons";
import { presetBounds } from "@/components/dashboard/range";
import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { PaymentBadge } from "@/features/payments/components/payment-badge";
import { sellerApi } from "../api";
import { orderStatusVariant } from "../status";
import type { SellerPanels, SellerShopOrderView } from "../types";

const PAGE_SIZE = 20;

const FILTERS = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
] as const;

const STATUS_ORDER = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
] as const;

function toNumber(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function SellerOrdersList({
  initialStatus,
  initialPage,
  initialData,
  initialPanels,
  initialRange,
}: {
  initialStatus: string;
  initialPage: number;
  initialData?: { data: SellerShopOrderView[]; meta?: unknown };
  initialPanels?: SellerPanels;
  initialRange?: DateRangeValue;
}) {
  const t = useTranslations("seller.orders");
  const td = useTranslations("admin.dashboard");
  const tStatus = useTranslations("seller.orderStatus");
  const tMethod = useTranslations("admin.paymentMethod");
  const locale = useLocale();
  const router = useRouter();
  const [range, setRange] = useState<DateRangeValue>(
    initialRange ?? { ...presetBounds("30d"), preset: "30d", compare: true },
  );

  const activeStatus = (FILTERS as readonly string[]).includes(initialStatus)
    ? initialStatus
    : "ALL";
  const page = Math.max(1, initialPage);

  const orders = useQuery({
    queryKey: queryKeys.seller.orders({ status: activeStatus, page }),
    queryFn: () =>
      sellerApi.listOrders({
        status: activeStatus === "ALL" ? undefined : activeStatus,
        page,
        limit: PAGE_SIZE,
      }),
    initialData: initialData
      ? { data: initialData.data, meta: initialData.meta as never }
      : undefined,
    retry: false,
  });

  const panels = useQuery({
    queryKey: queryKeys.seller.panels({ from: range.from, to: range.to }),
    queryFn: () => sellerApi.getPanels({ from: range.from, to: range.to }),
    initialData: initialPanels,
    retry: false,
  });

  const go = (status: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/seller/orders?${qs}` : "/seller/orders");
  };

  const items = orders.data?.data ?? [];
  const meta = orders.data?.meta;
  const data = panels.data;
  const labels = {
    viewData: td("viewData"),
    viewChart: td("viewChart"),
    exportCsv: td("exportCsv"),
  };
  const statusCounts = new Map(
    (data?.ordersByStatus ?? []).map((row) => [row.key, row.count]),
  );
  const statusTotal = STATUS_ORDER.reduce((sum, key) => sum + (statusCounts.get(key) ?? 0), 0);

  const columns: DataColumn<SellerShopOrderView>[] = [
    {
      key: "order",
      header: t("title"),
      render: (row) => (
        <Link href={`/seller/orders/${row.id}`} className="font-medium hover:underline">
          {row.shopOrderNumber}
          <span className="block text-xs font-normal text-muted-foreground">
            {row.order.orderNumber}
          </span>
        </Link>
      ),
      sortValue: (row) => row.shopOrderNumber,
    },
    {
      key: "date",
      header: t("eta"),
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatLatinDateTime(row.createdAt, locale)}
        </span>
      ),
      sortValue: (row) => row.createdAt,
      cardHidden: true,
    },
    {
      key: "payment",
      header: t("payment"),
      render: (row) => (
        <span className="grid gap-1">
          <span className="text-xs">{tMethod(row.order.paymentMethod as never)}</span>
          {row.order.paymentMethod === "ADVANCE" ? (
            <PaymentBadge status={row.order.paymentStatus === "PAID" ? "PAID" : "UNPAID"} />
          ) : null}
        </span>
      ),
      sortValue: (row) => row.order.paymentMethod,
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
      key: "total",
      header: t("total"),
      align: "end",
      render: (row) => <Price value={row.total} locale={locale} size="sm" />,
      sortValue: (row) => toNumber(row.total),
    },
    {
      key: "status",
      header: t("actions"),
      render: (row) => (
        <span className="grid gap-1 justify-items-start">
          <Badge variant={orderStatusVariant(row.status)}>{tStatus(row.status)}</Badge>
          {row.codRisk && row.codRisk !== "OK" ? (
            <Badge variant="destructive" className="text-[10px]">
              {t("codRiskBadge")}
            </Badge>
          ) : null}
        </span>
      ),
      sortValue: (row) => row.status,
    },
    {
      key: "action",
      header: t("actions"),
      render: (row) => (
        <Button asChild variant="outline" size="sm" className="min-h-11">
          <Link href={`/seller/orders/${row.id}`}>{t("viewDetails")}</Link>
        </Button>
      ),
      cardHidden: true,
    },
  ];

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
        aria-label={t("title")}
        tabIndex={0}
        className="flex min-w-0 snap-x gap-3 overflow-x-auto pb-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4"
      >
        {panels.isLoading || !data ? (
          Array.from({ length: 4 }, (_, index) => (
            <KpiSkeleton key={index} className="min-w-[15rem] snap-start sm:min-w-0" />
          ))
        ) : (
          <>
            <KpiCard
              className="min-w-[15rem] snap-start sm:min-w-0"
              label={t("orderRevenue")}
              value={<Price value={data.kpis.revenue.current} locale={locale} size="xl" />}
              delta={
                range.compare
                  ? { value: data.kpis.revenue.deltaPct, meaning: "good", label: td("previous") }
                  : undefined
              }
              sparkline={data.series.map((point) => toNumber(point.revenue))}
            />
            <KpiCard
              className="min-w-[15rem] snap-start sm:min-w-0"
              label={t("ordersCount")}
              value={data.kpis.orders.current}
              delta={
                range.compare
                  ? { value: data.kpis.orders.deltaPct, meaning: "neutral", label: td("previous") }
                  : undefined
              }
              sparkline={data.series.map((point) => point.orders)}
            />
            <KpiCard
              className="min-w-[15rem] snap-start sm:min-w-0"
              label={t("orderAov")}
              value={<Price value={data.kpis.aov.current} locale={locale} size="xl" />}
              delta={
                range.compare
                  ? { value: data.kpis.aov.deltaPct, meaning: "neutral", label: td("previous") }
                  : undefined
              }
            />
            <KpiCard
              className="min-w-[15rem] snap-start sm:min-w-0"
              label={t("orderDelivered")}
              value={data.kpis.deliveredOrders.current}
              delta={
                range.compare
                  ? {
                      value: data.kpis.deliveredOrders.deltaPct,
                      meaning: "good",
                      label: td("previous"),
                    }
                  : undefined
              }
              sparkline={data.series.map((point) => point.delivered)}
            />
          </>
        )}
      </div>

      <ChartCard
        title={t("ordersByStatus")}
        summary={td("summaryStatus", { total: statusTotal, count: STATUS_ORDER.length })}
        labels={labels}
        loading={panels.isLoading}
        error={
          panels.isError
            ? { message: t("loadError"), retryLabel: td("retry"), onRetry: () => void panels.refetch() }
            : undefined
        }
        empty={!panels.isLoading && statusTotal === 0 ? { message: t("empty") } : undefined}
        table={{
          columns: [
            { key: "status", label: t("actions") },
            { key: "count", label: t("items"), align: "end" },
          ],
          rows: STATUS_ORDER.map((key) => ({
            status: tStatus(key as never),
            count: statusCounts.get(key) ?? 0,
          })),
        }}
        csvName="seller-orders-by-status"
      >
        <BarChart
          orientation="horizontal"
          summary={td("summaryStatus", { total: statusTotal, count: STATUS_ORDER.length })}
          labels={STATUS_ORDER.map((key) => tStatus(key as never))}
          series={[
            {
              key: "count",
              label: t("items"),
              values: STATUS_ORDER.map((key) => statusCounts.get(key) ?? 0),
              colorIndex: 0,
            },
          ]}
        />
      </ChartCard>

      <div className="flex flex-wrap gap-1">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={activeStatus === filter ? "secondary" : "ghost"}
            onClick={() => go(filter, 1)}
            className="min-h-11"
          >
            {filter === "ALL" ? t("all") : tStatus(filter)}
          </Button>
        ))}
      </div>

      {orders.isLoading ? <TableSkeleton rows={5} /> : null}
      {orders.isError ? (
        <QueryError message={t("loadError")} onRetry={() => void orders.refetch()} />
      ) : null}
      {!orders.isLoading && !orders.isError && items.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : null}
      {!orders.isLoading && !orders.isError && items.length > 0 ? (
        <DataTable
          caption={t("title")}
          emptyText={t("empty")}
          getRowKey={(row) => row.id}
          columns={columns}
          rows={items}
          labels={{ density: t("items"), sortBy: t("actions") }}
        />
      ) : null}

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={page <= 1}
            onClick={() => go(activeStatus, page - 1)}
          >
            {t("prev")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pageOf", { page: meta.page, total: meta.totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={page >= meta.totalPages}
            onClick={() => go(activeStatus, page + 1)}
          >
            {t("next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
