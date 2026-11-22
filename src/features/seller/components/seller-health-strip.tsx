"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { BarChart } from "@/components/dashboard/bar-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DateRangePicker, type DateRangeValue } from "@/components/dashboard/date-range-picker";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProgressBar } from "@/components/dashboard/progress";
import { presetBounds } from "@/components/dashboard/range";
import { KpiSkeleton } from "@/components/dashboard/skeletons";
import { queryKeys } from "@/lib/api/query-keys";
import { formatCount } from "@/lib/format/number";
import { sellerApi } from "../api";
import type { SellerPanels } from "../types";

export type SellerHealthSection = "disputes" | "ratings" | "inventory";

/**
 * Seller health strip shared by complaints, reviews and products. It uses the
 * same read-only seller panels endpoint as the dashboard, so the numbers match
 * the dashboard for the same range.
 */
export function SellerHealthStrip({
  section,
  initialPanels,
  initialRange,
}: {
  section: SellerHealthSection;
  initialPanels?: SellerPanels;
  initialRange?: DateRangeValue;
}) {
  const t = useTranslations("seller.dashboard");
  const td = useTranslations("admin.dashboard");
  const tComplaintStatus = useTranslations("seller.complaintStatus");
  const locale = useLocale();
  const [range, setRange] = useState<DateRangeValue>(
    initialRange ?? { ...presetBounds("30d"), preset: "30d", compare: true },
  );

  const panels = useQuery({
    queryKey: queryKeys.seller.panels({ section, from: range.from, to: range.to }),
    queryFn: () => sellerApi.getPanels({ from: range.from, to: range.to }),
    initialData: initialPanels,
    retry: false,
  });
  const data = panels.data;
  const labels = {
    viewData: td("viewData"),
    viewChart: td("viewChart"),
    exportCsv: td("exportCsv"),
  };

  return (
    <section className="grid grid-cols-1 gap-3" aria-label={t("subtitle")}>
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

      {panels.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <KpiSkeleton key={index} />
          ))}
        </div>
      ) : null}
      {panels.isError ? <p className="text-sm text-muted-foreground">{t("noDataPeriod")}</p> : null}

      {data && section === "disputes" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-3 gap-2">
            <KpiCard label={t("openDisputes")} value={formatCount(data.disputes.open, locale)} />
            <KpiCard
              label={t("evidenceDueSoon")}
              value={formatCount(data.disputes.evidenceDueSoon, locale)}
            />
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
            title={t("openDisputes")}
            summary={td("summaryStatus", {
              total: data.disputes.byStatus.reduce((sum, row) => sum + row.count, 0),
              count: data.disputes.byStatus.length,
            })}
            labels={labels}
            empty={data.disputes.byStatus.length === 0 ? { message: t("noDataPeriod") } : undefined}
          >
            <BarChart
              orientation="horizontal"
              summary={td("summaryStatus", {
                total: data.disputes.byStatus.reduce((sum, row) => sum + row.count, 0),
                count: data.disputes.byStatus.length,
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
          </ChartCard>
        </div>
      ) : null}

      {data && section === "ratings" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <KpiCard
            label={t("ratingAvg")}
            value={`${formatCount(Number(data.ratings.avg), locale)} / 5`}
            footnote={`${formatCount(data.ratings.count, locale)} ${t("ratings")}`}
          />
          <ChartCard
            title={t("ratings")}
            summary={td("summaryDistribution", {
              count: data.ratings.count,
              avg: formatCount(Number(data.ratings.avg), locale),
            })}
            labels={labels}
            empty={data.ratings.count === 0 ? { message: t("noDataPeriod") } : undefined}
          >
            <BarChart
              summary={td("summaryDistribution", {
                count: data.ratings.count,
                avg: formatCount(Number(data.ratings.avg), locale),
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
          </ChartCard>
        </div>
      ) : null}

      {data && section === "inventory" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard
            title={t("lowStockTitle")}
            summary={`${t("lowStockLevel")} ${data.inventory.lowStock} · ${t("outOfStock")} ${data.inventory.outOfStock}`}
            labels={labels}
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
            </div>
          </ChartCard>
          <KpiCard
            label={t("activeProducts")}
            value={formatCount(data.inventory.activeProducts, locale)}
          />
        </div>
      ) : null}
    </section>
  );
}
