"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { BarChart } from "@/components/dashboard/bar-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DateRangePicker, type DateRangeValue } from "@/components/dashboard/date-range-picker";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineAreaChart } from "@/components/dashboard/line-area-chart";
import { ProgressBar } from "@/components/dashboard/progress";
import { presetBounds } from "@/components/dashboard/range";
import { KpiSkeleton } from "@/components/dashboard/skeletons";
import { Price } from "@/components/product/price";
import { queryKeys } from "@/lib/api/query-keys";
import { formatBdt } from "@/lib/format/money";
import { formatCount } from "@/lib/format/number";
import { adminApi } from "../api";
import type { AdminPanels } from "../types";

export type AnalyticsSection =
  | "disputes"
  | "refunds"
  | "withdrawals"
  | "verification"
  | "commission"
  | "inventory"
  | "people";

/**
 * Reusable health strip for the admin queue/finance pages. It uses the same
 * read-only panels endpoint and period model as the dashboard, so the numbers
 * on a list page always equal the dashboard's numbers for the same range.
 */
export function AnalyticsStrip({
  section,
  initialPanels,
  initialRange,
}: {
  section: AnalyticsSection;
  initialPanels?: AdminPanels;
  initialRange?: DateRangeValue;
}) {
  const t = useTranslations("admin.dashboard");
  const tStatus = useTranslations("admin.complaintStatus");
  const locale = useLocale();
  const [range, setRange] = useState<DateRangeValue>(
    initialRange ?? {
      ...presetBounds("30d"),
      preset: "30d",
      compare: true,
    },
  );

  const panels = useQuery({
    queryKey: queryKeys.admin.panels({ section, from: range.from, to: range.to }),
    queryFn: () => adminApi.panels({ from: range.from, to: range.to }),
    initialData: initialPanels,
    retry: false,
  });

  const data = panels.data;
  const labels = {
    viewData: t("viewData"),
    viewChart: t("viewChart"),
    exportCsv: t("exportCsv"),
  };
  const money = (value: string | number) => formatBdt(value, locale);

  return (
    <section className="grid grid-cols-1 gap-3" aria-label={t("dashboardSections")}>
      <DateRangePicker
        value={range}
        onChange={setRange}
        labels={{
          period: t("period"),
          today: t("today"),
          days7: t("days7"),
          days30: t("days30"),
          days90: t("days90"),
          custom: t("custom"),
          from: t("from"),
          to: t("to"),
          compare: t("compare"),
        }}
      />

      {panels.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <KpiSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {panels.isError ? (
        <p className="text-sm text-muted-foreground">{t("loadError")}</p>
      ) : null}

      {data && section === "disputes" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label={t("openDisputes")} value={formatCount(data.disputes.open, locale)} />
            <KpiCard label={t("createdInRange")} value={formatCount(data.disputes.createdInRange, locale)} />
            <KpiCard
              label={t("avgResolution")}
              value={
                data.disputes.avgResolutionHours === null
                  ? "—"
                  : `${formatCount(Math.round(data.disputes.avgResolutionHours * 10) / 10, locale)}h`
              }
            />
          </div>
          <ChartCard
            title={t("byStatus")}
            summary={t("summaryStatus", {
              total: data.disputes.byStatus.reduce((sum, row) => sum + row.count, 0),
              count: data.disputes.byStatus.length,
            })}
            labels={labels}
            empty={data.disputes.byStatus.length === 0 ? { message: t("noDataPeriod") } : undefined}
          >
            <DonutChart
              centerLabel={t("disputesTitle")}
              summary={t("summaryStatus", {
                total: data.disputes.byStatus.reduce((sum, row) => sum + row.count, 0),
                count: data.disputes.byStatus.length,
              })}
              data={data.disputes.byStatus.map((row) => ({
                label: tStatus(row.key as never),
                value: row.count,
              }))}
              otherLabel={t("other")}
              formatValue={(value) => formatCount(value, locale)}
            />
          </ChartCard>
        </div>
      ) : null}

      {data && section === "refunds" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label={t("refundsPending")}
            value={formatCount(data.refunds.pendingCount, locale)}
            footnote={money(data.refunds.pendingAmount)}
          />
          <KpiCard label={t("refundsProcessed")} value={formatCount(data.refunds.processedInRange, locale)} />
          <KpiCard
            label={t("advanceRequired")}
            value={formatCount(data.refunds.advanceRequiredCount, locale)}
            footnote={money(data.refunds.advanceRequiredAmount)}
          />
          <KpiCard label={t("refunds")} value={<Price value={data.kpis.refundsAmount.current} locale={locale} size="lg" />} />
        </div>
      ) : null}

      {data && section === "withdrawals" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard
              label={t("withdrawalsPending")}
              value={formatCount(data.withdrawals.pendingCount, locale)}
              footnote={money(data.withdrawals.pendingAmount)}
            />
            <KpiCard
              label={t("withdrawalsPaid")}
              value={formatCount(data.withdrawals.paidInRangeCount, locale)}
              footnote={money(data.withdrawals.paidInRangeAmount)}
            />
            <KpiCard
              label={t("avgTurnaround")}
              value={
                data.withdrawals.avgTurnaroundHours === null
                  ? "—"
                  : `${formatCount(Math.round(data.withdrawals.avgTurnaroundHours * 10) / 10, locale)}h`
              }
            />
          </div>
          <ChartCard
            title={t("aging")}
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
      ) : null}

      {data && section === "verification" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiCard
              label={t("verificationPending")}
              value={formatCount(data.verification.pendingCount, locale)}
            />
            <KpiCard
              label={t("verificationAmount")}
              value={<Price value={data.verification.pendingAmount} locale={locale} size="lg" />}
            />
          </div>
          <ChartCard
            title={t("verificationAging")}
            summary={t("summaryAging", {
              count: data.verification.pendingCount,
              oldest: data.verification.buckets[data.verification.buckets.length - 1]?.bucket ?? "—",
            })}
            labels={labels}
            empty={data.verification.buckets.length === 0 ? { message: t("noDataPeriod") } : undefined}
          >
            <BarChart
              summary={t("summaryAging", {
                count: data.verification.pendingCount,
                oldest: data.verification.buckets[data.verification.buckets.length - 1]?.bucket ?? "—",
              })}
              labels={data.verification.buckets.map((row) => row.bucket)}
              series={[
                {
                  key: "count",
                  label: t("items"),
                  values: data.verification.buckets.map((row) => row.count),
                  colorIndex: 3,
                },
              ]}
            />
          </ChartCard>
        </div>
      ) : null}

      {data && section === "commission" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              label={t("commission")}
              value={<Price value={data.kpis.commission.current} locale={locale} size="lg" />}
              delta={
                range.compare
                  ? { value: data.kpis.commission.deltaPct, meaning: "good", label: t("previous") }
                  : undefined
              }
            />
            <KpiCard
              label={t("gmv")}
              value={<Price value={data.kpis.gmv.current} locale={locale} size="lg" />}
            />
            <KpiCard
              label={t("aov")}
              value={<Price value={data.kpis.aov.current} locale={locale} size="lg" />}
            />
          </div>
          <ChartCard
            title={t("trendCommission")}
            summary={t("summarySeries", {
              metric: t("trendCommission"),
              count: data.series.length,
              latest: money(data.series[data.series.length - 1]?.commission ?? 0),
            })}
            labels={labels}
            empty={data.series.length === 0 ? { message: t("noDataPeriod") } : undefined}
            table={{
              columns: [
                { key: "bucket", label: t("period") },
                { key: "commission", label: t("commission"), align: "end" },
              ],
              rows: data.series.map((point) => ({
                bucket: point.bucket,
                commission: money(point.commission),
              })),
            }}
            csvName="commission-trend"
          >
            <LineAreaChart
              labels={data.series.map((point) => point.bucket)}
              series={[
                {
                  key: "commission",
                  label: t("commission"),
                  values: data.series.map((point) => Number(point.commission)),
                  colorIndex: 0,
                  variant: "area",
                },
              ]}
              summary={t("summarySeries", {
                metric: t("trendCommission"),
                count: data.series.length,
                latest: money(data.series[data.series.length - 1]?.commission ?? 0),
              })}
              formatValue={money}
            />
          </ChartCard>
        </div>
      ) : null}

      {data && section === "inventory" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="grid gap-3">
            <KpiCard
              label={t("lowStock")}
              value={formatCount(data.inventory.lowStock, locale)}
            />
            <KpiCard
              label={t("outOfStock")}
              value={formatCount(data.inventory.outOfStock, locale)}
            />
            <KpiCard
              label={t("activeProducts")}
              value={formatCount(data.inventory.activeProducts, locale)}
            />
          </div>
          <ChartCard
            title={t("inventoryTitle")}
            summary={`${t("lowStock")} ${data.inventory.lowStock} · ${t("outOfStock")} ${data.inventory.outOfStock}`}
            labels={labels}
          >
            <div className="grid gap-4">
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
            </div>
          </ChartCard>
        </div>
      ) : null}

      {data && section === "people" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KpiCard
            label={t("newCustomers")}
            value={formatCount(Number(data.kpis.newCustomers.current), locale)}
            delta={
              range.compare
                ? {
                    value: data.kpis.newCustomers.deltaPct,
                    meaning: "good",
                    label: t("previous"),
                  }
                : undefined
            }
            sparkline={data.series.map((point) => point.orders)}
          />
          <KpiCard
            label={t("newSellers")}
            value={formatCount(Number(data.kpis.newSellers.current), locale)}
            delta={
              range.compare
                ? {
                    value: data.kpis.newSellers.deltaPct,
                    meaning: "good",
                    label: t("previous"),
                  }
                : undefined
            }
          />
          <KpiCard
            label={t("orders")}
            value={formatCount(Number(data.kpis.orders.current), locale)}
            delta={
              range.compare
                ? { value: data.kpis.orders.deltaPct, meaning: "neutral", label: t("previous") }
                : undefined
            }
          />
        </div>
      ) : null}
    </section>
  );
}
