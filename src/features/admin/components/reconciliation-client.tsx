"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { ChartCard } from "@/components/dashboard/chart-card";
import { DataTable, type DataColumn } from "@/components/dashboard/data-table";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { BarChart } from "@/components/dashboard/bar-chart";
import { ChartSkeleton, TableSkeleton } from "@/components/dashboard/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Price } from "@/components/product/price";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import type { ReconciliationViolation } from "../types";

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function amount(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function ReconciliationClient() {
  const t = useTranslations("part4.reconciliation");
  const th = useTranslations("part4");
  const td = useTranslations("admin.dashboard");
  const tCommon = useTranslations("admin.common");
  const locale = useLocale();
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86_400_000);
  const [from, setFrom] = useState(toInputDate(monthAgo));
  const [to, setTo] = useState(toInputDate(today));
  const [range, setRange] = useState({ from, to });

  const fromIso = new Date(`${range.from}T00:00:00`).toISOString();
  const toIso = new Date(`${range.to}T23:59:59`).toISOString();

  const query = useQuery({
    queryKey: ["admin", "reconciliation", range],
    queryFn: () => adminApi.reconciliation({ from: fromIso, to: toIso }),
    retry: false,
  });

  const panels = useQuery({
    queryKey: ["admin", "panels", "reconciliation", fromIso, toIso],
    queryFn: () => adminApi.panels({ from: fromIso, to: toIso }),
    retry: false,
  });

  const result = query.data;
  const recon = panels.data?.reconciliation;

  const slices = recon
    ? [
        { label: td("platformHoldings"), value: amount(recon.platformHoldings) },
        { label: td("sellerPending"), value: amount(recon.sellerPending) },
        { label: td("sellerAvailable"), value: amount(recon.sellerAvailable) },
        { label: td("sellerOnHold"), value: amount(recon.sellerOnHold) },
        { label: td("refundPayable"), value: amount(recon.refundPayable) },
        { label: td("commission"), value: amount(recon.commission) },
      ]
    : [];
  const sliceSum = slices.reduce((sum, slice) => sum + slice.value, 0);
  const other = recon ? Math.max(0, amount(recon.buckets) - sliceSum) : 0;
  const donutData = other > 0 ? [...slices, { label: td("bucketOther"), value: other }] : slices;

  const columns: DataColumn<ReconciliationViolation>[] = [
    {
      key: "code",
      header: t("code"),
      render: (row) => <span className="font-medium">{row.code}</span>,
      sortValue: (row) => row.code,
    },
    {
      key: "entity",
      header: t("entity"),
      render: (row) => (
        <span className="grid">
          <span>{row.entityType}</span>
          <span className="text-xs text-muted-foreground">{row.entityId}</span>
        </span>
      ),
      sortValue: (row) => row.entityType,
      cardHidden: true,
    },
    {
      key: "message",
      header: t("message"),
      render: (row) => row.message,
      sortValue: (row) => row.message,
    },
    {
      key: "expected",
      header: t("expected"),
      align: "end",
      render: (row) => row.expected ?? "—",
      sortValue: (row) => amount(row.expected),
      cardHidden: true,
    },
    {
      key: "actual",
      header: t("actual"),
      align: "end",
      render: (row) => row.actual ?? "—",
      sortValue: (row) => amount(row.actual),
      cardHidden: true,
    },
  ];

  return (
    <div className="grid gap-4">
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="grid gap-1.5">
            <Label htmlFor="recon-from">{t("from")}</Label>
            <Input id="recon-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="recon-to">{t("to")}</Label>
            <Input id="recon-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <Button type="button" variant="cta" onClick={() => setRange({ from, to })}>
            {t("run")}
          </Button>
          {result ? (
            <p className="text-sm text-muted-foreground">{t("checked", { count: result.checked })}</p>
          ) : null}
        </CardContent>
      </Card>

      <p className="rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        {th("reconciliationHelp")}
      </p>

      {query.isLoading ? <ChartSkeleton height={200} /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}

      {result?.settlement ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl">
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{t("settlementTitle")}</h2>
                <Badge variant={result.settlement.balanced ? "secondary" : "destructive"}>
                  {result.settlement.balanced ? t("balanced") : t("breach")}
                </Badge>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <ReconStat label={t("receipts")} value={result.settlement.receipts} locale={locale} />
                <ReconStat label={t("buckets")} value={result.settlement.buckets} locale={locale} />
                <ReconStat
                  label={t("difference")}
                  value={result.settlement.difference}
                  locale={locale}
                  tone={result.settlement.balanced ? undefined : "danger"}
                />
                <ReconStat label={t("codDues")} value={result.settlement.codDues} locale={locale} />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("checkedAt", { date: formatLatinDateTime(new Date(query.dataUpdatedAt).toISOString()) })}
              </p>
              {!result.settlement.balanced ? (
                <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {t("breachWarning")}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <ChartCard
            title={td("bucketComposition")}
            summary={td("summaryRecon", {
              receipts: result.settlement.receipts,
              buckets: result.settlement.buckets,
              difference: result.settlement.difference,
            })}
            labels={{
              viewData: td("viewData"),
              viewChart: td("viewChart"),
              exportCsv: td("exportCsv"),
            }}
            loading={panels.isLoading}
            empty={
              !panels.isLoading && donutData.length === 0
                ? { message: td("noDataPeriod") }
                : undefined
            }
            table={{
              columns: [
                { key: "bucket", label: td("bucketComposition") },
                { key: "amount", label: td("total"), align: "end" },
              ],
              rows: donutData.map((slice) => ({
                bucket: slice.label,
                amount: formatAmount(slice.value, locale),
              })),
            }}
            csvName="settlement-buckets"
          >
            <div className="grid gap-4">
              <DonutChart
                centerLabel={td("total")}
                summary={td("summaryRecon", {
                  receipts: result.settlement.receipts,
                  buckets: result.settlement.buckets,
                  difference: result.settlement.difference,
                })}
                data={donutData}
                otherLabel={td("other")}
                formatValue={(value) => formatAmount(value, locale)}
              />
              <BarChart
                orientation="horizontal"
                summary={td("summaryRecon", {
                  receipts: result.settlement.receipts,
                  buckets: result.settlement.buckets,
                  difference: result.settlement.difference,
                })}
                labels={donutData.map((slice) => slice.label)}
                series={[
                  {
                    key: "amount",
                    label: td("total"),
                    values: donutData.map((slice) => slice.value),
                    colorIndex: 0,
                  },
                ]}
                height={Math.max(180, donutData.length * 34)}
                formatValue={(value) => formatAmount(value, locale)}
              />
            </div>
          </ChartCard>
        </div>
      ) : null}

      {result && result.violations.length === 0 ? (
        <Card className="grid place-items-center gap-2 rounded-2xl border-dashed p-10 text-center">
          <Badge variant="secondary" className="rounded-full">
            {t("okBadge")}
          </Badge>
          <p className="font-medium">{t("allClear")}</p>
          <p className="text-sm text-muted-foreground">{t("allClearHint")}</p>
        </Card>
      ) : null}

      {query.isLoading ? <TableSkeleton rows={5} /> : null}
      {result && result.violations.length > 0 ? (
        <DataTable
          caption={t("title")}
          emptyText={t("allClear")}
          getRowKey={(row) => `${row.code}-${row.entityId}`}
          columns={columns}
          rows={result.violations}
          labels={{ density: tCommon("density"), sortBy: tCommon("sortBy") }}
        />
      ) : null}
    </div>
  );
}

function formatAmount(value: string | number, locale: string): string {
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD-u-nu-latn" : "en-BD", {
    style: "currency",
    currency: "BDT",
    currencyDisplay: "narrowSymbol",
    numberingSystem: "latn",
    maximumFractionDigits: 2,
  }).format(amount(value));
}

function ReconStat({
  label,
  value,
  locale,
  tone,
}: {
  label: string;
  value: string;
  locale: string;
  tone?: "danger";
}) {
  return (
    <div className="grid gap-1 rounded-xl border border-border/60 bg-secondary/30 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={tone === "danger" ? "text-destructive" : undefined}>
        <Price value={value} locale={locale} size="sm" />
      </span>
    </div>
  );
}
