"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { AnimatedTabs } from "@/components/dashboard/animated-tabs";
import { BarChart } from "@/components/dashboard/bar-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DateRangePicker, type DateRangeValue } from "@/components/dashboard/date-range-picker";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineAreaChart } from "@/components/dashboard/line-area-chart";
import { Gauge, ProgressBar } from "@/components/dashboard/progress";
import { presetBounds } from "@/components/dashboard/range";
import { ChartSkeleton, KpiSkeleton } from "@/components/dashboard/skeletons";
import { QueryError } from "@/components/feedback/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Price } from "@/components/product/price";
import { useAuth } from "@/features/auth/auth-provider";
import { queryKeys } from "@/lib/api/query-keys";
import { formatBdt } from "@/lib/format/money";
import { formatCount } from "@/lib/format/number";
import { sellerApi } from "../api";
import type { SellerPanels, SellerStatus } from "../types";

const STATUS_VARIANT: Record<SellerStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

function toNumber(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function DashboardClient({
  initialPanels,
  initialRange,
}: {
  initialPanels?: SellerPanels;
  initialRange?: DateRangeValue;
} = {}) {
  const t = useTranslations("seller.dashboard");
  const td = useTranslations("admin.dashboard");
  const tStatus = useTranslations("seller.orderStatus");
  const tSellerStatus = useTranslations("seller.status");
  const tComplaintStatus = useTranslations("seller.complaintStatus");
  const tWallet = useTranslations("part4.wallet");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();
  const [range, setRange] = useState<DateRangeValue>(
    initialRange ?? { ...presetBounds("30d"), preset: "30d", compare: true },
  );

  const application = useQuery({
    queryKey: queryKeys.seller.application,
    queryFn: sellerApi.getApplication,
    retry: false,
  });
  const status: SellerStatus | undefined =
    application.data?.status ?? user?.sellerStatus ?? undefined;
  const approved = status === "APPROVED";

  const dashboard = useQuery({
    queryKey: queryKeys.seller.dashboard,
    queryFn: sellerApi.dashboard,
    enabled: approved,
    retry: false,
  });
  const shop = useQuery({
    queryKey: queryKeys.seller.shop,
    queryFn: sellerApi.getShop,
    enabled: approved,
    retry: false,
  });
  const panels = useQuery({
    queryKey: queryKeys.seller.panels({ from: range.from, to: range.to }),
    queryFn: () => sellerApi.getPanels({ from: range.from, to: range.to }),
    initialData: initialPanels,
    enabled: approved,
    retry: false,
  });

  if (application.isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (application.isError) {
    return (
      <QueryError message={tc("sectionLoadFailed")} onRetry={() => void application.refetch()} />
    );
  }

  const data = panels.data;
  const money = (value: string | number) => formatBdt(value, locale);
  const labels = {
    viewData: td("viewData"),
    viewChart: td("viewChart"),
    exportCsv: td("exportCsv"),
  };
  const rangeLabels = {
    period: td("period"),
    today: td("today"),
    days7: td("days7"),
    days30: td("days30"),
    days90: td("days90"),
    custom: td("custom"),
    from: td("from"),
    to: td("to"),
    compare: td("compare"),
  };

  const counters = dashboard.data;
  const actionTiles = [
    { href: "/seller/orders?status=PENDING", label: t("pendingOrders"), value: counters?.pendingOrders },
    { href: "/seller/orders?status=SHIPPED", label: t("stuckOrders"), value: counters?.stuckOrders },
    { href: "/seller/questions", label: t("unansweredQuestions"), value: counters?.unansweredQuestions },
    { href: "/seller/products", label: t("lowStock"), value: counters?.lowStockVariants },
    {
      href: "/seller/notifications",
      label: t("unreadNotifications"),
      value: counters?.unreadNotifications,
    },
  ];

  return (
    <div className="grid grid-cols-1 min-w-0 gap-6">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("applicationStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-2">
            {status ? <Badge variant={STATUS_VARIANT[status]}>{tSellerStatus(status)}</Badge> : null}
          </div>
          {status === "PENDING" ? (
            <p className="text-sm text-muted-foreground">{t("pendingNotice")}</p>
          ) : null}
          {status === "REJECTED" ? (
            <p className="text-sm text-destructive">
              {t("rejectedNotice")}
              {application.data?.rejectionReason
                ? ` — ${t("rejectionReason", { reason: application.data.rejectionReason })}`
                : ""}
            </p>
          ) : null}
          {status === "SUSPENDED" ? (
            <p className="text-sm text-destructive">{t("suspendedNotice")}</p>
          ) : null}
          {!approved ? (
            <div>
              <Button asChild variant="cta" size="lg">
                <Link href="/seller/apply">{t("completeApplication")}</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {approved ? (
        <>
          <DateRangePicker value={range} onChange={setRange} labels={rangeLabels} />

          <section aria-label={t("actionQueue")} className="grid grid-cols-1 gap-3">
            <h2 className="font-heading text-base font-semibold">{t("actionQueue")}</h2>
            <div
              tabIndex={0}
              aria-label={t("actionQueue")}
              className="flex min-w-0 snap-x gap-3 overflow-x-auto pb-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-5"
            >
              {dashboard.isError ? (
                <QueryError
                  message={tc("sectionLoadFailed")}
                  onRetry={() => void dashboard.refetch()}
                />
              ) : (
                actionTiles.map((tile) => (
                  <Link
                    key={tile.href}
                    href={tile.href}
                    className="min-w-[13rem] snap-start rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)] transition-colors hover:border-primary/40 sm:min-w-0"
                  >
                    <span className="text-xs text-muted-foreground">{tile.label}</span>
                    <span className="mt-1 block font-heading text-xl font-bold tabular-nums">
                      {dashboard.isLoading ? "…" : (tile.value ?? 0)}
                    </span>
                  </Link>
                ))
              )}
            </div>
          </section>

          {panels.isError ? (
            <QueryError message={t("noDataPeriod")} onRetry={() => void panels.refetch()} />
          ) : null}

          {panels.isLoading || !data ? (
            <div className="grid gap-5">
              <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }, (_, index) => (
                  <KpiSkeleton key={index} className="min-w-[15rem] snap-start sm:min-w-0" />
                ))}
              </div>
              <ChartSkeleton height={240} />
            </div>
          ) : (
            <>
              <div
                role="region"
                aria-label={t("keyMetrics")}
                tabIndex={0}
                className="flex min-w-0 snap-x gap-3 overflow-x-auto pb-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-6"
              >
                <KpiCard
                  className="min-w-[15rem] snap-start sm:min-w-0"
                  label={t("revenue")}
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
                  label={t("orders")}
                  value={formatCount(toNumber(data.kpis.orders.current), locale)}
                  delta={
                    range.compare
                      ? { value: data.kpis.orders.deltaPct, meaning: "neutral", label: td("previous") }
                      : undefined
                  }
                  sparkline={data.series.map((point) => point.orders)}
                />
                <KpiCard
                  className="min-w-[15rem] snap-start sm:min-w-0"
                  label={t("aov")}
                  value={<Price value={data.kpis.aov.current} locale={locale} size="xl" />}
                  delta={
                    range.compare
                      ? { value: data.kpis.aov.deltaPct, meaning: "neutral", label: td("previous") }
                      : undefined
                  }
                />
                <KpiCard
                  className="min-w-[15rem] snap-start sm:min-w-0"
                  label={t("delivered")}
                  value={formatCount(toNumber(data.kpis.deliveredOrders.current), locale)}
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
                <KpiCard
                  className="min-w-[15rem] snap-start sm:min-w-0"
                  label={t("commission")}
                  value={<Price value={data.kpis.commission.current} locale={locale} size="xl" />}
                  delta={
                    range.compare
                      ? {
                          value: data.kpis.commission.deltaPct,
                          meaning: "good",
                          label: td("previous"),
                        }
                      : undefined
                  }
                />
                <KpiCard
                  className="min-w-[15rem] snap-start sm:min-w-0"
                  label={t("cancellations")}
                  value={formatCount(toNumber(data.kpis.cancelledOrders.current), locale)}
                  delta={
                    range.compare
                      ? {
                          value: data.kpis.cancelledOrders.deltaPct,
                          meaning: "bad",
                          label: td("previous"),
                        }
                      : undefined
                  }
                  sparkline={data.series.map((point) => point.cancelled)}
                />
              </div>

              <ChartCard title={t("salesTrend")} labels={labels} empty={data.series.length === 0 ? { message: t("noDataPeriod") } : undefined}>
                <AnimatedTabs
                  label={t("salesTrend")}
                  urlParam="metric"
                  tabs={[
                    {
                      value: "revenue",
                      label: t("revenue"),
                      content: (
                        <Trend
                          labels={data.series.map((point) => point.bucket)}
                          values={data.series.map((point) => toNumber(point.revenue))}
                          label={t("revenue")}
                          formatValue={money}
                          summary={td("summarySeries", {
                            metric: t("revenue"),
                            count: data.series.length,
                            latest: money(data.series[data.series.length - 1]?.revenue ?? 0),
                          })}
                        />
                      ),
                    },
                    {
                      value: "orders",
                      label: t("orders"),
                      content: (
                        <Trend
                          labels={data.series.map((point) => point.bucket)}
                          values={data.series.map((point) => point.orders)}
                          label={t("orders")}
                          formatValue={(value) => formatCount(value, locale)}
                          summary={td("summarySeries", {
                            metric: t("orders"),
                            count: data.series.length,
                            latest: formatCount(data.series[data.series.length - 1]?.orders ?? 0, locale),
                          })}
                        />
                      ),
                    },
                    {
                      value: "delivered",
                      label: t("delivered"),
                      content: (
                        <Trend
                          labels={data.series.map((point) => point.bucket)}
                          values={data.series.map((point) => toNumber(point.deliveredRevenue))}
                          label={t("delivered")}
                          formatValue={money}
                          summary={td("summarySeries", {
                            metric: t("delivered"),
                            count: data.series.length,
                            latest: money(data.series[data.series.length - 1]?.deliveredRevenue ?? 0),
                          })}
                        />
                      ),
                    },
                    {
                      value: "cancelled",
                      label: t("cancellations"),
                      content: (
                        <Trend
                          labels={data.series.map((point) => point.bucket)}
                          values={data.series.map((point) => point.cancelled)}
                          label={t("cancellations")}
                          formatValue={(value) => formatCount(value, locale)}
                          summary={td("summarySeries", {
                            metric: t("cancellations"),
                            count: data.series.length,
                            latest: formatCount(data.series[data.series.length - 1]?.cancelled ?? 0, locale),
                          })}
                        />
                      ),
                    },
                  ]}
                />
              </ChartCard>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard
                  title={t("orders")}
                  summary={t("summaryStatus", {
                    total: data.ordersByStatus.reduce((sum, row) => sum + row.count, 0),
                    count: data.ordersByStatus.length,
                  })}
                  labels={labels}
                  actions={
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/seller/orders">{t("viewAll")}</Link>
                    </Button>
                  }
                  empty={data.ordersByStatus.length === 0 ? { message: t("noDataPeriod") } : undefined}
                  table={{
                    columns: [
                      { key: "status", label: t("orders") },
                      { key: "count", label: t("items"), align: "end" },
                    ],
                    rows: data.ordersByStatus.map((row) => ({
                      status: tStatus(row.key as never),
                      count: row.count,
                    })),
                  }}
                  csvName="seller-orders-by-status"
                >
                  <BarChart
                    orientation="horizontal"
                    summary={t("summaryStatus", {
                      total: data.ordersByStatus.reduce((sum, row) => sum + row.count, 0),
                      count: data.ordersByStatus.length,
                    })}
                    labels={data.ordersByStatus.map((row) => tStatus(row.key as never))}
                    series={[
                      {
                        key: "count",
                        label: t("orders"),
                        values: data.ordersByStatus.map((row) => row.count),
                        colorIndex: 0,
                      },
                    ]}
                  />
                </ChartCard>

                <ChartCard
                  title={t("walletSnapshot")}
                  summary={t("summaryWallet", {
                    available: money(data.wallet.available),
                    pending: money(data.wallet.pending),
                    onHold: money(data.wallet.onHold),
                  })}
                  labels={labels}
                  actions={
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/seller/earnings">{t("viewAll")}</Link>
                    </Button>
                  }
                  table={{
                    columns: [
                      { key: "label", label: t("walletSnapshot") },
                      { key: "amount", label: t("revenue"), align: "end" },
                    ],
                    rows: [
                      { label: t("available"), amount: money(data.wallet.available) },
                      { label: t("pending"), amount: money(data.wallet.pending) },
                      { label: t("onHold"), amount: money(data.wallet.onHold) },
                      { label: t("codDues"), amount: money(data.wallet.codDues) },
                    ],
                  }}
                  csvName="seller-wallet"
                >
                  <div className="grid gap-4">
                    <DonutChart
                      centerLabel={t("revenue")}
                      summary={t("summaryWallet", {
                        available: money(data.wallet.available),
                        pending: money(data.wallet.pending),
                        onHold: money(data.wallet.onHold),
                      })}
                      data={[
                        { label: t("available"), value: toNumber(data.wallet.available) },
                        { label: t("pending"), value: toNumber(data.wallet.pending) },
                        { label: t("onHold"), value: toNumber(data.wallet.onHold) },
                      ]}
                      otherLabel={td("other")}
                      formatValue={(value) => money(value)}
                    />
                    <Gauge
                      label={t("codDues")}
                      value={toNumber(data.wallet.codDues)}
                      max={Math.max(1, toNumber(data.wallet.codDuesLimit))}
                      valueText={`${money(data.wallet.codDues)} / ${money(data.wallet.codDuesLimit)}`}
                      tone={
                        toNumber(data.wallet.codDues) >= toNumber(data.wallet.codDuesLimit)
                          ? "offer"
                          : "primary"
                      }
                    />
                  </div>
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard
                  title={t("releaseTimeline")}
                  summary={t("summaryRelease", {
                    count: data.releaseTimeline.reduce((sum, row) => sum + row.count, 0),
                    amount: money(
                      data.releaseTimeline.reduce((sum, row) => sum + toNumber(row.amount), 0),
                    ),
                  })}
                  labels={labels}
                  empty={data.releaseTimeline.length === 0 ? { message: t("noDataPeriod") } : undefined}
                  table={{
                    columns: [
                      { key: "bucket", label: td("period") },
                      { key: "count", label: t("orders"), align: "end" },
                      { key: "amount", label: t("revenue"), align: "end" },
                    ],
                    rows: data.releaseTimeline.map((row) => ({
                      bucket: row.bucket,
                      count: row.count,
                      amount: money(row.amount),
                    })),
                  }}
                  csvName="seller-release-calendar"
                >
                  <BarChart
                    summary={t("summaryRelease", {
                      count: data.releaseTimeline.reduce((sum, row) => sum + row.count, 0),
                      amount: money(
                        data.releaseTimeline.reduce((sum, row) => sum + toNumber(row.amount), 0),
                      ),
                    })}
                    labels={data.releaseTimeline.map((row) => row.bucket)}
                    series={[
                      {
                        key: "amount",
                        label: t("revenue"),
                        values: data.releaseTimeline.map((row) => toNumber(row.amount)),
                        colorIndex: 2,
                      },
                    ]}
                    formatValue={money}
                  />
                </ChartCard>

                <ChartCard
                  title={t("disputeDeadlines")}
                  summary={t("summaryDispute", {
                    open: data.disputes.open,
                    due: data.disputes.evidenceDueSoon,
                  })}
                  labels={labels}
                  actions={
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/seller/complaints">{t("viewAll")}</Link>
                    </Button>
                  }
                  empty={
                    data.disputes.byStatus.length === 0
                      ? { message: t("noDataPeriod") }
                      : undefined
                  }
                >
                  <div className="grid gap-4">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <Metric label={t("openDisputes")} value={String(data.disputes.open)} />
                      <Metric label={t("evidenceDueSoon")} value={String(data.disputes.evidenceDueSoon)} />
                      <Metric
                        label={t("avgResolution")}
                        value={
                          data.disputes.avgResolutionHours === null
                            ? "—"
                            : `${formatCount(Math.round(data.disputes.avgResolutionHours * 10) / 10, locale)}h`
                        }
                      />
                    </div>
                    <BarChart
                      orientation="horizontal"
                      summary={t("summaryDispute", {
                        open: data.disputes.open,
                        due: data.disputes.evidenceDueSoon,
                      })}
                      labels={data.disputes.byStatus.map((row) =>
                        tComplaintStatus.has(row.key) ? tComplaintStatus(row.key as never) : row.key,
                      )}
                      series={[
                        {
                          key: "count",
                          label: t("openDisputes"),
                          values: data.disputes.byStatus.map((row) => row.count),
                          colorIndex: 3,
                        },
                      ]}
                    />
                  </div>
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <ChartCard
                  title={t("topProductsTitle")}
                  summary={td("summaryTop", {
                    count: data.topProducts.length,
                    metric: t("revenue"),
                  })}
                  labels={labels}
                  empty={data.topProducts.length === 0 ? { message: t("noDataPeriod") } : undefined}
                  table={{
                    columns: [
                      { key: "name", label: t("topProductsTitle") },
                      { key: "units", label: t("items"), align: "end" },
                      { key: "amount", label: t("revenue"), align: "end" },
                    ],
                    rows: data.topProducts.map((row) => ({
                      name: row.name,
                      units: row.units,
                      amount: money(row.amount),
                    })),
                  }}
                  csvName="seller-top-products"
                >
                  <BarChart
                    orientation="horizontal"
                    summary={td("summaryTop", {
                      count: data.topProducts.length,
                      metric: t("revenue"),
                    })}
                    labels={data.topProducts.map((row) => row.name)}
                    series={[
                      {
                        key: "amount",
                        label: t("revenue"),
                        values: data.topProducts.map((row) => toNumber(row.amount)),
                        colorIndex: 1,
                      },
                    ]}
                    formatValue={money}
                  />
                </ChartCard>

                <ChartCard
                  title={t("lowStockTitle")}
                  summary={`${t("lowStockLevel")} ${data.inventory.lowStock} · ${t("outOfStock")} ${data.inventory.outOfStock}`}
                  labels={labels}
                  actions={
                    <Button asChild size="sm" variant="ghost">
                      <Link href="/seller/products">{t("viewAll")}</Link>
                    </Button>
                  }
                >
                  <div className="grid gap-4">
                    <ProgressBar
                      label={t("lowStockLevel")}
                      value={data.inventory.lowStock}
                      max={Math.max(1, data.inventory.activeProducts)}
                      valueText={`${data.inventory.lowStock} / ${data.inventory.activeProducts}`}
                      tone="warning"
                    />
                    <ProgressBar
                      label={t("outOfStock")}
                      value={data.inventory.outOfStock}
                      max={Math.max(1, data.inventory.activeProducts)}
                      valueText={`${data.inventory.outOfStock} / ${data.inventory.activeProducts}`}
                      tone="offer"
                    />
                    <Metric
                      label={t("activeProducts")}
                      value={formatCount(data.inventory.activeProducts, locale)}
                    />
                  </div>
                </ChartCard>

                <ChartCard
                  title={t("ratings")}
                  summary={td("summaryDistribution", {
                    count: data.ratings.count,
                    avg: formatCount(toNumber(data.ratings.avg), locale),
                  })}
                  labels={labels}
                  empty={data.ratings.count === 0 ? { message: t("noDataPeriod") } : undefined}
                >
                  <div className="grid gap-3">
                    <BarChart
                      summary={td("summaryDistribution", {
                        count: data.ratings.count,
                        avg: formatCount(toNumber(data.ratings.avg), locale),
                      })}
                      labels={[1, 2, 3, 4, 5].map((rating) => `${rating}★`)}
                      series={[
                        {
                          key: "count",
                          label: t("ratings"),
                          values: [1, 2, 3, 4, 5].map(
                            (rating) =>
                              data.ratings.distribution.find((row) => row.rating === rating)?.count ?? 0,
                          ),
                          colorIndex: 2,
                        },
                      ]}
                    />
                    <Metric
                      label={t("ratingAvg")}
                      value={`${formatCount(toNumber(data.ratings.avg), locale)} / 5`}
                    />
                  </div>
                </ChartCard>
              </div>

              <ChartCard
                title={t("delivery")}
                subtitle={
                  data.delivery.avgDays === null
                    ? undefined
                    : `${t("avgDeliveryDays")}: ${formatCount(Math.round(data.delivery.avgDays * 10) / 10, locale)}`
                }
                summary={t("summaryStatus", {
                  total: data.delivery.buckets.reduce((sum, row) => sum + row.count, 0),
                  count: data.delivery.buckets.length,
                })}
                labels={labels}
                empty={data.delivery.buckets.length === 0 ? { message: t("noDataPeriod") } : undefined}
              >
                <BarChart
                  summary={t("summaryStatus", {
                    total: data.delivery.buckets.reduce((sum, row) => sum + row.count, 0),
                    count: data.delivery.buckets.length,
                  })}
                  labels={data.delivery.buckets.map((row) => row.bucket)}
                  series={[
                    {
                      key: "count",
                      label: t("orders"),
                      values: data.delivery.buckets.map((row) => row.count),
                      colorIndex: 0,
                    },
                  ]}
                />
              </ChartCard>
            </>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>{t("shopSummary")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm">
                {shop.isLoading ? <Skeleton className="h-12 w-full" /> : null}
                {shop.data ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{shop.data.name}</span>
                      <Badge variant="outline">{shop.data.slug}</Badge>
                      {shop.data.isOnVacation ? (
                        <Badge variant="secondary">{t("onVacation")}</Badge>
                      ) : null}
                    </div>
                    <div>
                      <Button asChild variant="outline" size="lg">
                        <Link href="/seller/shop">{t("viewShop")}</Link>
                      </Button>
                    </div>
                  </>
                ) : null}
                {shop.isError ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-muted-foreground">{t("noShop")}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => void shop.refetch()}
                    >
                      {tc("retry")}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>{t("quickLinks")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                <Button asChild variant="outline" size="lg">
                  <Link href="/seller/shop">{t("manageShop")}</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/seller/delivery-zones">{t("manageZones")}</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/seller/earnings">{tWallet("title")}</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/seller/payout-accounts">{t("managePayouts")}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5 rounded-xl border border-border/50 px-3 py-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="font-heading text-base font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function Trend({
  labels,
  values,
  label,
  formatValue,
  summary,
}: {
  labels: string[];
  values: number[];
  label: string;
  formatValue: (value: number) => string;
  summary: string;
}) {
  const td = useTranslations("admin.dashboard");
  return (
    <div className="grid gap-3">
      <LineAreaChart
        labels={labels}
        series={[{ key: "series", label, values, colorIndex: 0, variant: "area" }]}
        summary={summary}
        formatValue={formatValue}
      />
      <details className="rounded-xl border border-border/60 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
          {label}
        </summary>
        <div className="mt-2 max-h-56 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-start font-medium text-muted-foreground">{td("period")}</th>
                <th className="text-end font-medium text-muted-foreground">{label}</th>
              </tr>
            </thead>
            <tbody>
              {labels.map((bucket, index) => (
                <tr key={bucket} className="border-t border-border/40">
                  <td className="py-1">{bucket}</td>
                  <td className="py-1 text-end tabular-nums">{formatValue(values[index] ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
