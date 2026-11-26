"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  Bell,
  ChevronDown,
  ChevronUp,
  Clock3,
  MessagesSquare,
  Package,
  PackageSearch,
  Percent,
  RotateCcw,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
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
import { formatLatinDateTime } from "@/lib/format/date";
import { formatBdt } from "@/lib/format/money";
import { formatCount } from "@/lib/format/number";
import { sellerApi } from "../api";
import { orderStatusVariant as sellerOrderStatusVariant } from "../status";
import type { SellerPanels, SellerShopOrderView, SellerStatus } from "../types";

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
  initialOrders,
  initialRange,
}: {
  initialPanels?: SellerPanels;
  initialOrders?: SellerShopOrderView[];
  initialRange?: DateRangeValue;
} = {}) {
  const t = useTranslations("seller.dashboard");
  const td = useTranslations("admin.dashboard");
  const tStatus = useTranslations("seller.orderStatus");
  const tSellerStatus = useTranslations("seller.status");
  const tComplaintStatus = useTranslations("seller.complaintStatus");
  const tWallet = useTranslations("part4.wallet");
  const tShop = useTranslations("seller.shop");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user } = useAuth();
  const [range, setRange] = useState<DateRangeValue>(
    initialRange ?? { ...presetBounds("30d"), preset: "30d", compare: true },
  );
  // Mobile-first: the trend and order breakdown are secondary; the first
  // screen keeps action queue, KPIs, recent orders and the wallet snapshot.
  const [showPerformance, setShowPerformance] = useState(false);

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
  const actionTiles: {
    href?: string;
    label: string;
    value: number | undefined;
    icon: LucideIcon;
  }[] = [
    {
      href: "/seller/orders?status=PENDING",
      label: t("pendingOrders"),
      value: counters?.pendingOrders,
      icon: ShoppingCart,
    },
    {
      href: "/seller/orders?status=SHIPPED",
      label: t("stuckOrders"),
      value: counters?.stuckOrders,
      icon: Clock3,
    },
    {
      href: "/seller/questions",
      label: t("unansweredQuestions"),
      value: counters?.unansweredQuestions,
      icon: MessagesSquare,
    },
    {
      href: "/seller/products",
      label: t("lowStock"),
      value: counters?.lowStockVariants,
      icon: PackageSearch,
    },
    {
      href: undefined,
      label: t("unreadNotifications"),
      value: counters?.unreadNotifications,
      icon: Bell,
    },
  ];

  const pickupIncomplete = Boolean(
    shop.data &&
      (!shop.data.pickupDistrictId ||
        ((shop.data.pickupDistrict?.name ?? shop.data.district) === "Dhaka" &&
          !shop.data.pickupThanaId)),
  );

  return (
    <div className="grid grid-cols-1 min-w-0 gap-6">
      {approved && pickupIncomplete ? (
        <p className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {tShop("pickupIncomplete")}{" "}
          <Link href="/seller/shop" className="font-medium underline underline-offset-4">
            {tShop("title")}
          </Link>
        </p>
      ) : null}
      {approved ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="text-xs">{t("applicationStatus")}</span>
          <Badge variant={STATUS_VARIANT.APPROVED}>{tSellerStatus("APPROVED")}</Badge>
        </div>
      ) : (
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
            <div>
              <Button asChild variant="cta" size="lg">
                <Link href="/seller/apply">{t("completeApplication")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {approved ? (
        <>
          <DateRangePicker value={range} onChange={setRange} labels={rangeLabels} />

          <section aria-label={t("actionQueue")} className="grid grid-cols-1 gap-3">
            <h2 className="font-heading text-base font-semibold">{t("actionQueue")}</h2>
            {dashboard.isError ? (
              <QueryError
                message={tc("sectionLoadFailed")}
                onRetry={() => void dashboard.refetch()}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 min-[380px]:grid-cols-3 min-[380px]:gap-2 lg:gap-3 lg:grid-cols-3 xl:grid-cols-5">
                {actionTiles.map((tile) => {
                  const Icon = tile.icon;
                  const body = (
                    <>
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-xs leading-snug text-muted-foreground">
                          {tile.label}
                        </span>
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                          <Icon aria-hidden className="size-4" />
                        </span>
                      </span>
                      <span className="mt-3 block font-heading text-xl font-bold tabular-nums">
                        {dashboard.isLoading ? "…" : (tile.value ?? 0)}
                      </span>
                    </>
                  );
                  const shell =
                    "group flex min-h-24 flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)] transition-colors hover:border-primary/40";
                  return tile.href ? (
                    <Link key={tile.href} href={tile.href} className={shell}>
                      {body}
                    </Link>
                  ) : (
                    <div key={tile.label} className={shell}>
                      {body}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {panels.isError ? (
            <QueryError message={t("noDataPeriod")} onRetry={() => void panels.refetch()} />
          ) : null}

          {panels.isLoading || !data ? (
            <div className="grid gap-5">
              <div className="grid grid-cols-2 gap-3 min-[380px]:grid-cols-3 min-[380px]:gap-2 lg:gap-3 lg:grid-cols-3 xl:grid-cols-6">
                {Array.from({ length: 6 }, (_, index) => (
                  <KpiSkeleton key={index} />
                ))}
              </div>
              <ChartSkeleton height={240} />
            </div>
          ) : (
            <>
              <section aria-label={t("keyMetrics")} className="grid grid-cols-1 gap-3">
                <h2 className="font-heading text-base font-semibold">{t("keyMetrics")}</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                  <KpiCard
                    featured
                    icon={<Banknote aria-hidden className="size-4" />}
                    href="/seller/earnings"
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
                    icon={<ShoppingCart aria-hidden className="size-4" />}
                    href="/seller/orders"
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
                    href="/seller/orders"
                    label={t("aov")}
                    value={<Price value={data.kpis.aov.current} locale={locale} size="xl" />}
                    delta={
                      range.compare
                        ? { value: data.kpis.aov.deltaPct, meaning: "neutral", label: td("previous") }
                        : undefined
                    }
                  />
                  <KpiCard
                    icon={<Package aria-hidden className="size-4" />}
                    href="/seller/orders?status=DELIVERED"
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
                    icon={<Percent aria-hidden className="size-4" />}
                    href="/seller/earnings"
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
                    icon={<RotateCcw aria-hidden className="size-4" />}
                    href="/seller/orders?status=CANCELLED"
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
              </section>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <CardTitle className="font-heading text-base font-semibold">
                    {t("recentOrders")}
                  </CardTitle>
                  <Button asChild variant="ghost" size="sm" className="min-h-11">
                    <Link href="/seller/orders">{t("viewAll")}</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  {(initialOrders ?? []).length === 0 ? (
                    <p className="rounded-xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">
                      {t("recentOrdersEmpty")}
                    </p>
                  ) : (
                    <ul className="divide-y divide-border/50">
                      {(initialOrders ?? []).map((order) => (
                        <li
                          key={order.id}
                          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/seller/orders/${order.id}`}
                              className="block truncate font-medium underline-offset-4 hover:underline"
                            >
                              {order.shopOrderNumber}
                            </Link>
                            <p className="truncate text-xs text-muted-foreground">
                              {order.order.orderNumber} · {order.items.length} {t("items")}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge variant={sellerOrderStatusVariant(order.status)}>
                              {tStatus(order.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatLatinDateTime(order.createdAt, locale)}
                            </span>
                            <Price value={order.total} locale={locale} size="sm" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="lg:hidden"
                aria-expanded={showPerformance}
                aria-controls="seller-performance-trend seller-performance-orders"
                onClick={() => setShowPerformance((value) => !value)}
              >
                {t("performanceSection")}
                {showPerformance ? (
                  <ChevronUp aria-hidden className="ms-2 size-4" />
                ) : (
                  <ChevronDown aria-hidden className="ms-2 size-4" />
                )}
              </Button>

              <div
                id="seller-performance-trend"
                className={showPerformance ? "block" : "hidden lg:block"}
              >
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
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div
                  id="seller-performance-orders"
                  className={showPerformance ? "block" : "hidden lg:block"}
                >
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
                    height={180}
                  />
                </ChartCard>
                </div>

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
                  <ul className="grid grid-cols-2 gap-3 lg:hidden">
                    {[
                      { label: t("available"), value: data.wallet.available },
                      { label: t("pending"), value: data.wallet.pending },
                      { label: t("onHold"), value: data.wallet.onHold },
                      { label: t("codDues"), value: data.wallet.codDues },
                    ].map((row) => (
                      <li key={row.label} className="rounded-xl border border-border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">{row.label}</p>
                        <Price value={row.value} locale={locale} size="sm" />
                      </li>
                    ))}
                  </ul>
                  <div className="hidden gap-4 lg:grid">
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

              <AnimatedTabs
                label={t("keyMetrics")}
                urlParam="analytics"
                tabs={[
                  {
                    value: "operations",
                    label: t("operationsSection"),
                    content: (
                      <div className="grid grid-cols-1 gap-4">
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

                      </div>
                    ),
                  },
                  {
                    value: "catalogue",
                    label: t("catalogueDelivery"),
                    content: (
                      <div className="grid grid-cols-1 gap-4">
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
                    <Gauge
                      label={t("ratingAvg")}
                      value={toNumber(data.ratings.avg)}
                      max={5}
                      valueText={`${formatCount(toNumber(data.ratings.avg), locale)} / 5`}
                    />
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
                      </div>
                    ),
                  },
                ]}
              />
            </>
          )}

          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="font-heading text-base font-semibold">
                {t("shopSummary")}
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="min-h-11">
                <Link href="/seller/shop">{t("viewShop")}</Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {shop.isLoading ? <Skeleton className="h-12 w-full" /> : null}
              {shop.data ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{shop.data.name}</span>
                  <Badge variant="outline">{shop.data.slug}</Badge>
                  {shop.data.isOnVacation ? (
                    <Badge variant="secondary">{t("onVacation")}</Badge>
                  ) : null}
                </div>
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
              <div className="grid gap-2 sm:grid-cols-2">
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
              </div>
            </CardContent>
          </Card>
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
        height={180}
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

