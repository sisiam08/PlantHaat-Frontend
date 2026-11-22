"use client";

import { useState } from "react";

import { AnimatedTabs } from "@/components/dashboard/animated-tabs";
import { BarChart } from "@/components/dashboard/bar-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DataTable, type DataColumn } from "@/components/dashboard/data-table";
import { DateRangePicker, type DateRangeValue } from "@/components/dashboard/date-range-picker";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { LineAreaChart } from "@/components/dashboard/line-area-chart";
import { Gauge, ProgressBar } from "@/components/dashboard/progress";
import { StatusTimeline } from "@/components/dashboard/status-timeline";
import { presetBounds } from "@/components/dashboard/range";

const labels = { viewData: "View data", viewChart: "View chart", exportCsv: "Export CSV" };

const DAYS = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 9, 24 + index));
  return {
    day: date.toISOString().slice(0, 10),
    gmv: 42000 + Math.round(Math.sin(index / 2.4) * 16000) + index * 900,
    orders: 34 + Math.round(Math.cos(index / 3) * 9),
  };
});

const gmvSeries = DAYS.map((row) => row.gmv);
const previousSeries = DAYS.map((row, index) => Math.round(row.gmv * (0.72 + (index % 5) * 0.03)));

interface ProductRow {
  id: string;
  name: string;
  units: number;
  revenue: string;
}

const productRows: ProductRow[] = [
  { id: "1", name: "Monstera Deliciosa", units: 42, revenue: "৳50,400" },
  { id: "2", name: "Peace Lily", units: 31, revenue: "৳20,150" },
  { id: "3", name: "Snake Plant", units: 27, revenue: "৳16,200" },
  { id: "4", name: "Areca Palm", units: 18, revenue: "৳14,400" },
  { id: "5", name: "Echeveria", units: 15, revenue: "৳5,250" },
];

const productColumns: DataColumn<ProductRow>[] = [
  { key: "name", header: "Product", render: (row) => row.name, sortValue: (row) => row.name },
  { key: "units", header: "Units", align: "end", render: (row) => row.units, sortValue: (row) => row.units },
  {
    key: "revenue",
    header: "Revenue",
    align: "end",
    render: (row) => row.revenue,
    sortValue: (row) => Number(row.revenue.replace(/[^\d]/g, "")),
  },
];

export function DashboardKitPreview() {
  const [range, setRange] = useState<DateRangeValue>({
    ...presetBounds("30d", new Date("2026-11-22T10:00:00.000Z")),
    preset: "30d",
    compare: true,
  });

  return (
    <div className="grid gap-6">
      <DateRangePicker
        value={range}
        onChange={setRange}
        labels={{
          period: "Period",
          today: "Today",
          days7: "7 days",
          days30: "30 days",
          days90: "90 days",
          custom: "Custom",
          from: "From",
          to: "To",
          compare: "Compare previous period",
        }}
      />

      <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
        {[
          { label: "GMV", value: "৳12.5M", delta: 12.5, meaning: "good" as const, spark: gmvSeries },
          { label: "Orders", value: "1,204", delta: 4.2, meaning: "good" as const, spark: DAYS.map((row) => row.orders) },
          { label: "Refunds", value: "৳18,400", delta: -8.1, meaning: "good" as const, spark: DAYS.map((row) => row.orders / 20) },
          { label: "AOV", value: "৳10,382", delta: -2.6, meaning: "bad" as const, spark: gmvSeries.map((value) => value / 40) },
        ].map((item) => (
          <div key={item.label} className="min-w-[15rem] snap-start sm:min-w-0">
            <KpiCard
              label={item.label}
              value={item.value}
              delta={{ value: item.delta, meaning: item.meaning, label: "vs previous 30 days" }}
              sparkline={item.spark}
            />
          </div>
        ))}
      </div>

      <AnimatedTabs
        label="Dashboard kit sections"
        urlParam="kit"
        tabs={[
          {
            value: "charts",
            label: "Charts",
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard
                  title="GMV trend"
                  subtitle="Asia/Dhaka calendar days"
                  summary="GMV rose across the period; the dashed line is the previous period."
                  labels={labels}
                  table={{
                    columns: [
                      { key: "day", label: "Day" },
                      { key: "gmv", label: "GMV", align: "end" },
                      { key: "previous", label: "Previous", align: "end" },
                    ],
                    rows: DAYS.map((row, index) => ({
                      day: row.day,
                      gmv: row.gmv,
                      previous: previousSeries[index],
                    })),
                  }}
                  csvName="gmv-trend"
                  className="lg:col-span-2"
                >
                  <LineAreaChart
                    labels={DAYS.map((row) => row.day)}
                    series={[
                      { key: "gmv", label: "GMV", values: gmvSeries, colorIndex: 0, variant: "area" },
                      {
                        key: "previous",
                        label: "Previous",
                        values: previousSeries,
                        colorIndex: 3,
                        variant: "line",
                        dashed: true,
                      },
                    ]}
                    summary="GMV trend for the last 30 days compared with the previous period."
                  />
                </ChartCard>
                <ChartCard
                  title="Payment mix"
                  summary="Cash on delivery is the largest share of orders."
                  labels={labels}
                >
                  <DonutChart
                    centerLabel="Orders"
                    summary="Payment mix by method."
                    data={[
                      { label: "Cash on delivery", value: 720 },
                      { label: "Advance", value: 380 },
                      { label: "Other", value: 104 },
                    ]}
                  />
                </ChartCard>
                <ChartCard
                  title="Top products"
                  summary="Monstera leads revenue and units."
                  labels={labels}
                >
                  <BarChart
                    orientation="horizontal"
                    summary="Top products by units."
                    labels={productRows.map((row) => row.name)}
                    series={[
                      {
                        key: "units",
                        label: "Units",
                        values: productRows.map((row) => row.units),
                        colorIndex: 1,
                      },
                    ]}
                  />
                </ChartCard>
                <ChartCard title="Order pipeline" summary="Delivered orders are 41% of placed." labels={labels}>
                  <FunnelChart
                    summary="Order pipeline by status."
                    stages={[
                      { label: "Placed", value: 1204 },
                      { label: "Confirmed", value: 1010 },
                      { label: "Packed", value: 860 },
                      { label: "Shipped", value: 720 },
                      { label: "Delivered", value: 494 },
                    ]}
                  />
                </ChartCard>
                <ChartCard title="Stock health" summary="12 variants are low and 3 are out of stock." labels={labels}>
                  <div className="grid gap-4">
                    <ProgressBar label="Low stock" value={12} max={80} valueText="12 of 80" tone="warning" />
                    <ProgressBar label="Out of stock" value={3} max={80} valueText="3 of 80" tone="offer" />
                    <Gauge label="COD dues vs limit" value={640} max={1000} valueText="৳640 / ৳1,000" tone="offer" />
                  </div>
                </ChartCard>
              </div>
            ),
          },
          {
            value: "table",
            label: "Data table",
            content: (
              <ChartCard
                title="Top products"
                summary="Sortable table with sticky header, density and mobile cards."
                labels={labels}
              >
                <DataTable
                  caption="Top products"
                  emptyText="No products"
                  getRowKey={(row) => row.id}
                  columns={productColumns}
                  rows={productRows}
                  labels={{ density: "Density", sortBy: "Sort by" }}
                />
              </ChartCard>
            ),
          },
          {
            value: "timeline",
            label: "Status timeline",
            content: (
              <ChartCard
                title="Settlement timeline"
                summary="Funds release after the return window closes."
                labels={labels}
              >
                <StatusTimeline
                  label="Settlement timeline"
                  steps={[
                    { label: "Delivered", detail: "21 Nov 2026, 14:10", state: "done" },
                    { label: "Return window", detail: "Closes 23 Nov 2026, 14:10", state: "current" },
                    { label: "Available", detail: "Pending release", state: "pending" },
                  ]}
                />
              </ChartCard>
            ),
          },
        ]}
      />
    </div>
  );
}
