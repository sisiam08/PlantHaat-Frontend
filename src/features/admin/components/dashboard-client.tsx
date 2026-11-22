"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { AnimatedTabs } from "@/components/dashboard/animated-tabs";
import { BarChart } from "@/components/dashboard/bar-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DateRangePicker, type DateRangeValue } from "@/components/dashboard/date-range-picker";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineAreaChart } from "@/components/dashboard/line-area-chart";
import { ProgressBar } from "@/components/dashboard/progress";
import { presetBounds } from "@/components/dashboard/range";
import { ChartSkeleton, KpiSkeleton } from "@/components/dashboard/skeletons";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/product/price";
import { queryKeys } from "@/lib/api/query-keys";
import { formatBdt } from "@/lib/format/money";
import { formatCount } from "@/lib/format/number";
import { cn } from "@/lib/utils";
import { adminApi } from "../api";
import type { AdminPanels } from "../types";

function toNumber(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function DashboardClient({
  initialPanels,
  initialRange,
}: {
  initialPanels?: AdminPanels;
  initialRange?: DateRangeValue;
} = {}) {
  const t = useTranslations("admin.dashboard");
  const tStatus = useTranslations("admin.orderStatus");
  const tComplaintStatus = useTranslations("admin.complaintStatus");
  const tComplaintType = useTranslations("admin.complaintType");
  const tMethod = useTranslations("admin.paymentMethod");
  const locale = useLocale();
  const [range, setRange] = useState<DateRangeValue>(
    initialRange ?? {
      ...presetBounds("30d"),
      preset: "30d",
      compare: true,
    },
  );

  const panels = useQuery({
    queryKey: queryKeys.admin.panels({ from: range.from, to: range.to }),
    queryFn: () => adminApi.panels({ from: range.from, to: range.to }),
    initialData: initialPanels,
    retry: false,
  });

  // Only the six legacy counters are not part of the panels payload.
  const overview = useQuery({
    queryKey: queryKeys.admin.analytics({ from: range.from, to: range.to }),
    queryFn: () => adminApi.analytics({ from: range.from, to: range.to }),
    retry: false,
  });

  const labels = {
    viewData: t("viewData"),
    viewChart: t("viewChart"),
    exportCsv: t("exportCsv"),
  };
  const rangeLabels = {
    period: t("period"),
    today: t("today"),
    days7: t("days7"),
    days30: t("days30"),
    days90: t("days90"),
    custom: t("custom"),
    from: t("from"),
    to: t("to"),
    compare: t("compare"),
  };

  const data = panels.data;
  const money = (value: string | number) => formatBdt(value, locale);

  if (panels.isLoading) {
    return (
      <div className="grid grid-cols-1 min-w-0 gap-5" aria-busy="true">
        <DateRangePicker value={range} onChange={setRange} labels={rangeLabels} />
        <div
        role="region"
        aria-label={t("dashboardSections")}
        tabIndex={0}
        className="flex min-w-0 snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4"
      >
          {Array.from({ length: 8 }, (_, index) => (
            <KpiSkeleton key={index} className="min-w-[15rem] snap-start sm:min-w-0" />
          ))}
        </div>
        <ChartSkeleton height={240} />
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton height={200} />
          <ChartSkeleton height={200} />
        </div>
      </div>
    );
  }

  if (panels.isError || !data) {
    return (
      <div className="grid grid-cols-1 gap-3">
        <DateRangePicker value={range} onChange={setRange} labels={rangeLabels} />
        <div role="alert" className="grid justify-items-start gap-2 rounded-2xl bg-muted/60 p-4">
          <p className="text-sm text-muted-foreground">{t("loadError")}</p>
          <button
            type="button"
            onClick={() => void panels.refetch()}
            className="min-h-9 rounded-lg border border-input px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  const kpis = data.kpis;
  const series = data.series;
  const seriesLabels = series.map((point) => point.bucket);
  const noSeries = series.length === 0;

  const queueTiles: { href: string; label: string; value: string; tone?: "danger" }[] = [
    {
      href: "/admin/complaints?status=OPEN",
      label: t("openDisputes"),
      value: formatCount(data.disputes.open, locale),
      tone: data.disputes.open > 0 ? "danger" : undefined,
    },
    {
      href: "/admin/withdrawals?status=PENDING",
      label: t("withdrawalsPending"),
      value: formatCount(data.withdrawals.pendingCount, locale),
      tone: data.withdrawals.pendingCount > 0 ? "danger" : undefined,
    },
    {
      href: "/admin/advance-refunds",
      label: t("advanceRequired"),
      value: formatCount(data.refunds.advanceRequiredCount, locale),
      tone: data.refunds.advanceRequiredCount > 0 ? "danger" : undefined,
    },
    {
      href: "/admin/advance-payments",
      label: t("verificationPending"),
      value: formatCount(data.verification.pendingCount, locale),
      tone: data.verification.pendingCount > 0 ? "danger" : undefined,
    },
    {
      href: "/admin/reconciliation",
      label: t("reconciliationTitle"),
      value: data.reconciliation.balanced ? t("balanced") : t("breach"),
      tone: data.reconciliation.balanced ? undefined : "danger",
    },
  ];

  const legacyStats: { label: string; value: string; href?: string }[] = [
    {
      label: t("pendingApprovals"),
      value: formatCount(overview.data?.pendingApprovals ?? 0, locale),
      href: "/admin/sellers?status=PENDING",
    },
    {
      label: t("cancellationRate"),
      value: `${formatCount(overview.data?.cancellationRate ?? 0, locale)}%`,
    },
    {
      label: t("complaintRate"),
      value: `${formatCount(overview.data?.complaintRate ?? 0, locale)}%`,
    },
    {
      label: t("stuckOrders"),
      value: formatCount(overview.data?.stuckOrders ?? 0, locale),
      href: "/admin/stuck-orders",
    },
    {
      label: t("suspendedSellerOpenOrders"),
      value: formatCount(overview.data?.suspendedSellerOpenOrders ?? 0, locale),
      href: "/admin/suspended-sellers",
    },
    {
      label: t("falseDeliveryFlags"),
      value: formatCount(overview.data?.falseDeliveryFlags ?? 0, locale),
      href: "/admin/sellers",
    },
  ];

  const statusKeys = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED", "FAILED_DELIVERY"];
  const statusCounts = new Map(data.ordersByStatus.map((row) => [row.key, row.count]));
  const statusTotal = statusKeys.reduce((sum, key) => sum + (statusCounts.get(key) ?? 0), 0);

  const verificationBuckets = data.verification.buckets;
  const verificationOldest = verificationBuckets[verificationBuckets.length - 1]?.bucket ?? "—";

  const paymentSlices = data.paymentMix
    .filter((row) => row.count > 0)
    .map((row) => ({
      label: tMethod(row.key as never),
      value: row.count,
    }));

  const reconSlices = [
    { label: t("platformHoldings"), value: toNumber(data.reconciliation.platformHoldings) },
    { label: t("sellerPending"), value: toNumber(data.reconciliation.sellerPending) },
    { label: t("sellerAvailable"), value: toNumber(data.reconciliation.sellerAvailable) },
    { label: t("sellerOnHold"), value: toNumber(data.reconciliation.sellerOnHold) },
    { label: t("refundPayable"), value: toNumber(data.reconciliation.refundPayable) },
    { label: t("commission"), value: toNumber(data.reconciliation.commission) },
  ];
  const bucketSum = reconSlices.reduce((sum, slice) => sum + slice.value, 0);
  const bucketOther = Math.max(0, toNumber(data.reconciliation.buckets) - bucketSum);
  const reconDonut =
    bucketOther > 0 ? [...reconSlices, { label: t("bucketOther"), value: bucketOther }] : reconSlices;

  const trendTabs = [
    {
      value: "gmv",
      label: t("trendGmv"),
      content: (
        <TrendChart
          labels={seriesLabels}
          values={series.map((point) => toNumber(point.gmv))}
          label={t("trendGmv")}
          formatValue={money}
          summary={t("summarySeries", {
            metric: t("trendGmv"),
            count: series.length,
            latest: money(series[series.length - 1]?.gmv ?? 0),
          })}
          tableLabel={t("trendGmv")}
          empty={noSeries ? t("noDataPeriod") : undefined}
        />
      ),
    },
    {
      value: "orders",
      label: t("trendOrders"),
      content: (
        <TrendChart
          labels={seriesLabels}
          values={series.map((point) => point.orders)}
          label={t("trendOrders")}
          formatValue={(value) => formatCount(value, locale)}
          summary={t("summarySeries", {
            metric: t("trendOrders"),
            count: series.length,
            latest: formatCount(series[series.length - 1]?.orders ?? 0, locale),
          })}
          tableLabel={t("trendOrders")}
          empty={noSeries ? t("noDataPeriod") : undefined}
        />
      ),
    },
    {
      value: "delivered",
      label: t("trendDelivered"),
      content: (
        <TrendChart
          labels={seriesLabels}
          values={series.map((point) => toNumber(point.deliveredRevenue))}
          label={t("trendDelivered")}
          formatValue={money}
          summary={t("summarySeries", {
            metric: t("trendDelivered"),
            count: series.length,
            latest: money(series[series.length - 1]?.deliveredRevenue ?? 0),
          })}
          tableLabel={t("trendDelivered")}
          empty={noSeries ? t("noDataPeriod") : undefined}
        />
      ),
    },
    {
      value: "commission",
      label: t("trendCommission"),
      content: (
        <TrendChart
          labels={seriesLabels}
          values={series.map((point) => toNumber(point.commission))}
          label={t("trendCommission")}
          formatValue={money}
          summary={t("summarySeries", {
            metric: t("trendCommission"),
            count: series.length,
            latest: money(series[series.length - 1]?.commission ?? 0),
          })}
          tableLabel={t("trendCommission")}
          empty={noSeries ? t("noDataPeriod") : undefined}
        />
      ),
    },
  ];

  const topTabs = [
    {
      value: "shops",
      label: t("topShops"),
      content: (
        <RankingCard
          title={t("topShops")}
          labels={labels}
          rows={data.topShops.map((row, index) => ({
            key: row.shop?.id ?? `shop-${index}`,
            name: row.shop?.name ?? "—",
            metric: t("gmv"),
            value: toNumber(row.amount),
            valueText: money(row.amount),
            detail: `${formatCount(row.orders, locale)} ${t("orders")}`,
          }))}
          empty={t("noDataPeriod")}
          summary={t("summaryTop", { count: data.topShops.length, metric: t("gmv") })}
          formatValue={money}
        />
      ),
    },
    {
      value: "products",
      label: t("topProducts"),
      content: (
        <RankingCard
          title={t("topProducts")}
          labels={labels}
          rows={data.topProducts.map((row, index) => ({
            key: row.id ?? `product-${index}`,
            name: row.name,
            metric: t("gmv"),
            value: toNumber(row.amount),
            valueText: money(row.amount),
            detail: `${formatCount(row.units, locale)} ${t("items")}`,
          }))}
          empty={t("noDataPeriod")}
          summary={t("summaryTop", { count: data.topProducts.length, metric: t("gmv") })}
          formatValue={money}
        />
      ),
    },
    {
      value: "categories",
      label: t("topCategories"),
      content: (
        <RankingCard
          title={t("topCategories")}
          labels={labels}
          rows={data.topCategories.map((row, index) => ({
            key: row.id ?? `category-${index}`,
            name: row.name,
            metric: t("gmv"),
            value: toNumber(row.amount),
            valueText: money(row.amount),
            detail: `${formatCount(row.units, locale)} ${t("items")}`,
          }))}
          empty={t("noDataPeriod")}
          summary={t("summaryTop", { count: data.topCategories.length, metric: t("gmv") })}
          formatValue={money}
        />
      ),
    },
    {
      value: "districts",
      label: t("topDistricts"),
      content: (
        <RankingCard
          title={t("topDistricts")}
          labels={labels}
          rows={data.topDistricts.map((row) => ({
            key: row.key,
            name: row.key,
            metric: t("orders"),
            value: row.count,
            valueText: formatCount(row.count, locale),
            detail: "",
          }))}
          empty={t("noDataPeriod")}
          summary={t("summaryTop", { count: data.topDistricts.length, metric: t("orders") })}
          formatValue={(value) => formatCount(value, locale)}
        />
      ),
    },
  ];

  const ratingCounts = new Map(data.ratings.distribution.map((row) => [row.rating, row.count]));
  const deliveryLabels = data.delivery.buckets.map((row) => row.bucket);

  return (
    <div className="grid grid-cols-1 min-w-0 gap-5">
      <DateRangePicker value={range} onChange={setRange} labels={rangeLabels} />

      <section aria-label={t("needsAttention")} className="grid grid-cols-1 gap-3">
        <h2 className="font-heading text-base font-semibold">{t("needsAttention")}</h2>
        <div
          tabIndex={0}
          aria-label={t("needsAttention")}
          className="flex min-w-0 snap-x gap-3 overflow-x-auto pb-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-5"
        >
          {queueTiles.map((tile) => (
            <Link
              key={tile.href + tile.label}
              href={tile.href}
              className="min-w-[13rem] snap-start rounded-2xl border border-border/60 bg-card p-4 shadow-[var(--shadow-soft)] transition-colors hover:border-primary/40 sm:min-w-0"
            >
              <span className="text-xs text-muted-foreground">{tile.label}</span>
              <span
                className={cn(
                  "mt-1 block font-heading text-xl font-bold tabular-nums",
                  tile.tone === "danger" ? "text-offer" : "text-foreground",
                )}
              >
                {tile.value}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div
        role="region"
        aria-label={t("dashboardSections")}
        tabIndex={0}
        className="flex min-w-0 snap-x gap-3 overflow-x-auto pb-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4"
      >
        <KpiCard
          className="min-w-[15rem] snap-start sm:min-w-0"
          label={t("gmv")}
          value={<Price value={kpis.gmv.current} locale={locale} size="xl" />}
          delta={range.compare ? { value: kpis.gmv.deltaPct, meaning: "good", label: t("previous") } : undefined}
          sparkline={series.map((point) => toNumber(point.gmv))}
        />
        <KpiCard
          className="min-w-[15rem] snap-start sm:min-w-0"
          label={t("orders")}
          value={formatCount(toNumber(kpis.orders.current), locale)}
          delta={range.compare ? { value: kpis.orders.deltaPct, meaning: "neutral", label: t("previous") } : undefined}
          sparkline={series.map((point) => point.orders)}
        />
        <KpiCard
          className="min-w-[15rem] snap-start sm:min-w-0"
          label={t("aov")}
          value={<Price value={kpis.aov.current} locale={locale} size="xl" />}
          delta={range.compare ? { value: kpis.aov.deltaPct, meaning: "neutral", label: t("previous") } : undefined}
        />
        <KpiCard
          className="min-w-[15rem] snap-start sm:min-w-0"
          label={t("deliveredOrders")}
          value={formatCount(toNumber(kpis.deliveredOrders.current), locale)}
          delta={
            range.compare
              ? { value: kpis.deliveredOrders.deltaPct, meaning: "good", label: t("previous") }
              : undefined
          }
          sparkline={series.map((point) => point.delivered)}
        />
        <KpiCard
          className="min-w-[15rem] snap-start sm:min-w-0"
          label={t("commission")}
          value={<Price value={kpis.commission.current} locale={locale} size="xl" />}
          delta={
            range.compare
              ? { value: kpis.commission.deltaPct, meaning: "good", label: t("previous") }
              : undefined
          }
          sparkline={series.map((point) => toNumber(point.commission))}
        />
        <KpiCard
          className="min-w-[15rem] snap-start sm:min-w-0"
          label={t("newCustomers")}
          value={formatCount(toNumber(kpis.newCustomers.current), locale)}
          delta={
            range.compare
              ? { value: kpis.newCustomers.deltaPct, meaning: "good", label: t("previous") }
              : undefined
          }
        />
        <KpiCard
          className="min-w-[15rem] snap-start sm:min-w-0"
          label={t("newSellers")}
          value={formatCount(toNumber(kpis.newSellers.current), locale)}
          delta={
            range.compare
              ? { value: kpis.newSellers.deltaPct, meaning: "good", label: t("previous") }
              : undefined
          }
        />
        <KpiCard
          className="min-w-[15rem] snap-start sm:min-w-0"
          label={t("refunds")}
          value={<Price value={kpis.refundsAmount.current} locale={locale} size="xl" />}
          delta={
            range.compare
              ? { value: kpis.refundsAmount.deltaPct, meaning: "bad", label: t("previous") }
              : undefined
          }
        />
      </div>

      <section aria-label={t("operations")} className="grid grid-cols-1 gap-3">
        <h2 className="font-heading text-base font-semibold">{t("operations")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {legacyStats.map((stat) => {
            const body = (
              <>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className="mt-1 block font-heading text-lg font-semibold tabular-nums">
                  {overview.isLoading ? "…" : stat.value}
                </span>
              </>
            );
            return stat.href ? (
              <Link
                key={stat.label}
                href={stat.href}
                className="rounded-xl border border-border/60 bg-card p-3 transition-colors hover:border-primary/40"
              >
                {body}
              </Link>
            ) : (
              <div key={stat.label} className="rounded-xl border border-border/60 bg-card p-3">
                {body}
              </div>
            );
          })}
        </div>
      </section>

      <ChartCard
        title={t("trendTitle")}
        labels={labels}
        empty={noSeries ? { message: t("noDataPeriod") } : undefined}
      >
        <AnimatedTabs label={t("trendTitle")} urlParam="trend" tabs={trendTabs} />
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={t("ordersByStatus")}
          summary={t("summaryStatus", { total: statusTotal, count: statusKeys.length })}
          labels={labels}
          empty={statusTotal === 0 ? { message: t("noDataPeriod") } : undefined}
          table={{
            columns: [
              { key: "status", label: t("status") },
              { key: "count", label: t("items"), align: "end" },
            ],
            rows: statusKeys.map((key) => ({ status: tStatus(key as never), count: statusCounts.get(key) ?? 0 })),
          }}
          csvName="orders-by-status"
        >
          <BarChart
            orientation="horizontal"
            summary={t("summaryStatus", { total: statusTotal, count: statusKeys.length })}
            labels={statusKeys.map((key) => tStatus(key as never))}
            series={[
              {
                key: "count",
                label: t("items"),
                values: statusKeys.map((key) => statusCounts.get(key) ?? 0),
                colorIndex: 0,
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          title={t("paymentMix")}
          summary={t("summaryMix", {
            total: paymentSlices.reduce((sum, slice) => sum + slice.value, 0),
            largest: paymentSlices[0]?.label ?? "—",
          })}
          labels={labels}
          empty={paymentSlices.length === 0 ? { message: t("noDataPeriod") } : undefined}
          table={{
            columns: [
              { key: "method", label: t("payment") },
              { key: "count", label: t("items"), align: "end" },
            ],
            rows: paymentSlices.map((slice) => ({ method: slice.label, count: slice.value })),
          }}
          csvName="payment-mix"
        >
          <DonutChart
            centerLabel={t("orders")}
            summary={t("summaryMix", {
              total: paymentSlices.reduce((sum, slice) => sum + slice.value, 0),
              largest: paymentSlices[0]?.label ?? "—",
            })}
            data={paymentSlices}
            otherLabel={t("other")}
            formatValue={(value) => formatCount(value, locale)}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={t("verificationAging")}
          subtitle={`${t("verificationAmount")}: ${money(data.verification.pendingAmount)}`}
          summary={t("summaryAging", { count: data.verification.pendingCount, oldest: verificationOldest })}
          labels={labels}
          empty={verificationBuckets.length === 0 ? { message: t("noDataPeriod") } : undefined}
          table={{
            columns: [
              { key: "bucket", label: t("aging") },
              { key: "count", label: t("items"), align: "end" },
              { key: "amount", label: t("total"), align: "end" },
            ],
            rows: verificationBuckets.map((row) => ({
              bucket: row.bucket,
              count: row.count,
              amount: money(row.amount),
            })),
          }}
          csvName="verification-aging"
        >
          <BarChart
            summary={t("summaryAging", { count: data.verification.pendingCount, oldest: verificationOldest })}
            labels={verificationBuckets.map((row) => row.bucket)}
            series={[
              {
                key: "count",
                label: t("items"),
                values: verificationBuckets.map((row) => row.count),
                colorIndex: 3,
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          title={t("disputesTitle")}
          subtitle={`${t("avgResolution")}: ${
            data.disputes.avgResolutionHours === null
              ? "—"
              : `${formatCount(Math.round(data.disputes.avgResolutionHours * 10) / 10, locale)}h`
          }`}
          summary={t("summaryStatus", {
            total: data.disputes.byStatus.reduce((sum, row) => sum + row.count, 0),
            count: data.disputes.byStatus.length,
          })}
          labels={labels}
          empty={data.disputes.byStatus.length === 0 ? { message: t("noDataPeriod") } : undefined}
          table={{
            columns: [
              { key: "status", label: t("byStatus") },
              { key: "count", label: t("items"), align: "end" },
            ],
            rows: data.disputes.byStatus.map((row) => ({
              status: tComplaintStatus(row.key as never),
              count: row.count,
            })),
          }}
          csvName="disputes-by-status"
        >
          <DonutChart
            centerLabel={t("disputesTitle")}
            summary={t("summaryStatus", {
              total: data.disputes.byStatus.reduce((sum, row) => sum + row.count, 0),
              count: data.disputes.byStatus.length,
            })}
            data={data.disputes.byStatus.map((row) => ({
              label: tComplaintStatus(row.key as never),
              value: row.count,
            }))}
            otherLabel={t("other")}
            formatValue={(value) => formatCount(value, locale)}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title={t("byType")}
          summary={t("summaryStatus", {
            total: data.disputes.byType.reduce((sum, row) => sum + row.count, 0),
            count: data.disputes.byType.length,
          })}
          labels={labels}
          empty={data.disputes.byType.length === 0 ? { message: t("noDataPeriod") } : undefined}
        >
          <BarChart
            orientation="horizontal"
            summary={t("summaryStatus", {
              total: data.disputes.byType.reduce((sum, row) => sum + row.count, 0),
              count: data.disputes.byType.length,
            })}
            labels={data.disputes.byType.map((row) => tComplaintType(row.key as never))}
            series={[
              {
                key: "count",
                label: t("items"),
                values: data.disputes.byType.map((row) => row.count),
                colorIndex: 1,
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          title={t("aging")}
          summary={t("summaryAging", {
            count: data.disputes.aging.reduce((sum, row) => sum + row.count, 0),
            oldest: data.disputes.aging[data.disputes.aging.length - 1]?.bucket ?? "—",
          })}
          labels={labels}
          empty={data.disputes.aging.length === 0 ? { message: t("noDataPeriod") } : undefined}
        >
          <BarChart
            summary={t("summaryAging", {
              count: data.disputes.aging.reduce((sum, row) => sum + row.count, 0),
              oldest: data.disputes.aging[data.disputes.aging.length - 1]?.bucket ?? "—",
            })}
            labels={data.disputes.aging.map((row) => row.bucket)}
            series={[
              {
                key: "count",
                label: t("items"),
                values: data.disputes.aging.map((row) => row.count),
                colorIndex: 4,
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          title={t("withdrawalsTitle")}
          subtitle={`${t("avgTurnaround")}: ${
            data.withdrawals.avgTurnaroundHours === null
              ? "—"
              : `${formatCount(Math.round(data.withdrawals.avgTurnaroundHours * 10) / 10, locale)}h`
          }`}
          summary={t("summaryAging", {
            count: data.withdrawals.pendingCount,
            oldest: data.withdrawals.aging[data.withdrawals.aging.length - 1]?.bucket ?? "—",
          })}
          labels={labels}
          empty={data.withdrawals.aging.length === 0 ? { message: t("noDataPeriod") } : undefined}
        >
          <BarChart
            summary={t("summaryAging", {
              count: data.withdrawals.pendingCount,
              oldest: data.withdrawals.aging[data.withdrawals.aging.length - 1]?.bucket ?? "—",
            })}
            labels={data.withdrawals.aging.map((row) => row.bucket)}
            series={[
              {
                key: "count",
                label: t("items"),
                values: data.withdrawals.aging.map((row) => row.count),
                colorIndex: 2,
              },
            ]}
          />
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title={t("refundsTitle")}
          summary={t("summaryAging", {
            count: data.refunds.pendingCount,
            oldest: money(data.refunds.advanceRequiredAmount),
          })}
          labels={labels}
          empty={
            data.refunds.pendingCount === 0 && data.refunds.advanceRequiredCount === 0
              ? { message: t("noDataPeriod") }
              : undefined
          }
          table={{
            columns: [
              { key: "label", label: t("refundsTitle") },
              { key: "count", label: t("items"), align: "end" },
              { key: "amount", label: t("total"), align: "end" },
            ],
            rows: [
              { label: t("refundsPending"), count: data.refunds.pendingCount, amount: money(data.refunds.pendingAmount) },
              {
                label: t("refundsProcessed"),
                count: data.refunds.processedInRange,
                amount: money(data.refunds.processedAmount),
              },
              {
                label: t("advanceRequired"),
                count: data.refunds.advanceRequiredCount,
                amount: money(data.refunds.advanceRequiredAmount),
              },
            ],
          }}
          csvName="refunds-queue"
        >
          <MetricList
            items={[
              { label: t("refundsPending"), value: String(data.refunds.pendingCount), detail: money(data.refunds.pendingAmount) },
              {
                label: t("refundsProcessed"),
                value: String(data.refunds.processedInRange),
                detail: money(data.refunds.processedAmount),
              },
              {
                label: t("advanceRequired"),
                value: String(data.refunds.advanceRequiredCount),
                detail: money(data.refunds.advanceRequiredAmount),
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          title={t("withdrawalsTitle")}
          summary={t("summaryAging", {
            count: data.withdrawals.pendingCount,
            oldest: money(data.withdrawals.pendingAmount),
          })}
          labels={labels}
          empty={
            data.withdrawals.pendingCount === 0 && data.withdrawals.paidInRangeCount === 0
              ? { message: t("noDataPeriod") }
              : undefined
          }
        >
          <MetricList
            items={[
              {
                label: t("withdrawalsPending"),
                value: String(data.withdrawals.pendingCount),
                detail: money(data.withdrawals.pendingAmount),
              },
              {
                label: t("withdrawalsPaid"),
                value: String(data.withdrawals.paidInRangeCount),
                detail: money(data.withdrawals.paidInRangeAmount),
              },
              {
                label: t("avgTurnaround"),
                value:
                  data.withdrawals.avgTurnaroundHours === null
                    ? "—"
                    : `${formatCount(Math.round(data.withdrawals.avgTurnaroundHours * 10) / 10, locale)}h`,
                detail: "",
              },
            ]}
          />
        </ChartCard>
      </div>

      <ChartCard
        title={t("reconciliationTitle")}
        summary={t("summaryRecon", {
          receipts: money(data.reconciliation.receipts),
          buckets: money(data.reconciliation.buckets),
          difference: money(data.reconciliation.difference),
        })}
        labels={labels}
        actions={
          <Badge variant={data.reconciliation.balanced ? "secondary" : "destructive"}>
            {data.reconciliation.balanced ? t("balanced") : t("breach")}
          </Badge>
        }
        table={{
          columns: [
            { key: "label", label: t("reconciliationTitle") },
            { key: "amount", label: t("total"), align: "end" },
          ],
          rows: [
            { label: t("receipts"), amount: money(data.reconciliation.receipts) },
            { label: t("buckets"), amount: money(data.reconciliation.buckets) },
            { label: t("difference"), amount: money(data.reconciliation.difference) },
            { label: t("codDues"), amount: money(data.reconciliation.codDues) },
            ...reconSlices.map((slice) => ({
              label: slice.label,
              amount: money(slice.value),
            })),
          ],
        }}
        csvName="settlement-reconciliation"
      >
        <div className="grid grid-cols-1 gap-3">
          {!data.reconciliation.balanced ? (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {t("breach")}
            </p>
          ) : null}
          <DonutChart
            centerLabel={t("buckets")}
            summary={t("summaryRecon", {
              receipts: money(data.reconciliation.receipts),
              buckets: money(data.reconciliation.buckets),
              difference: money(data.reconciliation.difference),
            })}
            data={reconDonut}
            otherLabel={t("other")}
            formatValue={(value) => money(value)}
          />
          <div className="grid gap-1 text-sm sm:grid-cols-2">
            <MetricRow label={t("receipts")} value={money(data.reconciliation.receipts)} />
            <MetricRow label={t("buckets")} value={money(data.reconciliation.buckets)} />
            <MetricRow label={t("difference")} value={money(data.reconciliation.difference)} />
            <MetricRow label={t("codDues")} value={money(data.reconciliation.codDues)} />
          </div>
        </div>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title={t("inventoryTitle")}
          summary={`${t("lowStock")} ${data.inventory.lowStock} · ${t("outOfStock")} ${data.inventory.outOfStock}`}
          labels={labels}
        >
          <div className="grid grid-cols-1 gap-4">
            <ProgressBar
              label={t("lowStock")}
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
            <MetricRow label={t("activeProducts")} value={formatCount(data.inventory.activeProducts, locale)} />
          </div>
        </ChartCard>

        <ChartCard
          title={t("ratingsTitle")}
          summary={t("summaryDistribution", {
            count: data.ratings.count,
            avg: formatCount(toNumber(data.ratings.avg), locale),
          })}
          labels={labels}
          empty={data.ratings.count === 0 ? { message: t("noDataPeriod") } : undefined}
        >
          <div className="grid grid-cols-1 gap-3">
            <BarChart
              summary={t("summaryDistribution", {
                count: data.ratings.count,
                avg: formatCount(toNumber(data.ratings.avg), locale),
              })}
              labels={[1, 2, 3, 4, 5].map((rating) => `${rating}★`)}
              series={[
                {
                  key: "count",
                  label: t("items"),
                  values: [1, 2, 3, 4, 5].map((rating) => ratingCounts.get(rating) ?? 0),
                  colorIndex: 2,
                },
              ]}
            />
            <MetricRow
              label={t("ratingAvg")}
              value={`${formatCount(toNumber(data.ratings.avg), locale)} / 5`}
            />
          </div>
        </ChartCard>

        <ChartCard
          title={t("deliveryTitle")}
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
            labels={deliveryLabels}
            series={[
              {
                key: "count",
                label: t("items"),
                values: data.delivery.buckets.map((row) => row.count),
                colorIndex: 0,
              },
            ]}
          />
        </ChartCard>
      </div>

      <section aria-label={t("topLists")} className="grid grid-cols-1 gap-3">
        <h2 className="font-heading text-base font-semibold">{t("topLists")}</h2>
        <AnimatedTabs label={t("topLists")} urlParam="top" tabs={topTabs} />
      </section>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

function MetricList({
  items,
}: {
  items: { label: string; value: string; detail: string }[];
}) {
  return (
    <ul className="grid gap-2">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border/50 px-3 py-2"
        >
          <span className="text-xs text-muted-foreground">{item.label}</span>
          <span className="font-heading text-base font-semibold tabular-nums">{item.value}</span>
          {item.detail ? <span className="text-xs text-muted-foreground">{item.detail}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function TrendChart({
  labels,
  values,
  label,
  formatValue,
  summary,
  tableLabel,
  empty,
}: {
  labels: string[];
  values: number[];
  label: string;
  formatValue: (value: number) => string;
  summary: string;
  tableLabel: string;
  empty?: string;
}) {
  const t = useTranslations("admin.dashboard");
  if (empty) {
    return <p className="rounded-xl bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3">
      <LineAreaChart
        labels={labels}
        series={[{ key: "series", label, values, colorIndex: 0, variant: "area" }]}
        summary={summary}
        formatValue={formatValue}
      />
      <details className="rounded-xl border border-border/60 px-3 py-2">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
          {tableLabel}
        </summary>
        <div className="mt-2 max-h-56 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-start font-medium text-muted-foreground">{t("period")}</th>
                <th className="text-end font-medium text-muted-foreground">{tableLabel}</th>
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

function RankingCard({
  title,
  labels,
  rows,
  empty,
  summary,
  formatValue,
}: {
  title: string;
  labels: { viewData: string; viewChart: string; exportCsv: string };
  rows: { key: string; name: string; metric: string; value: number; valueText: string; detail: string }[];
  empty: string;
  summary: string;
  formatValue: (value: number) => string;
}): ReactNode {
  const t = useTranslations("admin.dashboard");
  return (
    <ChartCard
      title={title}
      summary={summary}
      labels={labels}
      empty={rows.length === 0 ? { message: empty } : undefined}
      table={{
        columns: [
          { key: "name", label: t("name") },
          { key: "detail", label: t("details") },
          { key: "value", label: t("total"), align: "end" },
        ],
        rows: rows.map((row) => ({ name: row.name, detail: row.detail, value: row.valueText })),
      }}
      csvName="top-list"
    >
      <BarChart
        orientation="horizontal"
        summary={summary}
        labels={rows.map((row) => row.name)}
        series={[{ key: "value", label: title, values: rows.map((row) => row.value), colorIndex: 1 }]}
        formatValue={formatValue}
      />
    </ChartCard>
  );
}
