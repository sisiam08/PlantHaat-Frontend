"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Price } from "@/components/product/price";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ReconciliationClient() {
  const t = useTranslations("part4.reconciliation");
  const th = useTranslations("part4");
  const locale = useLocale();
  const today = new Date();
  const monthAgo = new Date(today.getTime() - 30 * 86_400_000);
  const [from, setFrom] = useState(toInputDate(monthAgo));
  const [to, setTo] = useState(toInputDate(today));
  const [range, setRange] = useState({ from, to });

  const query = useQuery({
    queryKey: ["admin", "reconciliation", range],
    queryFn: () =>
      adminApi.reconciliation({
        from: new Date(`${range.from}T00:00:00`).toISOString(),
        to: new Date(`${range.to}T23:59:59`).toISOString(),
      }),
    retry: false,
  });

  const result = query.data;

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
            <p className="text-sm text-muted-foreground">
              {t("checked", { count: result.checked })}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <p className="rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
        {th("reconciliationHelp")}
      </p>

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? (
        <p className="text-sm text-muted-foreground">{t("loadError")}</p>
      ) : null}

      {result?.settlement ? (
        <Card className="rounded-2xl">
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t("settlementTitle")}</h2>
              <Badge variant={result.settlement.balanced ? "secondary" : "destructive"}>
                {result.settlement.balanced ? t("balanced") : t("breach")}
              </Badge>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
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

      {result && result.violations.length > 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("code")}</th>
                  <th className="px-3 py-2">{t("entity")}</th>
                  <th className="px-3 py-2">{t("message")}</th>
                  <th className="px-3 py-2 text-right">{t("expected")}</th>
                  <th className="px-3 py-2 text-right">{t("actual")}</th>
                </tr>
              </thead>
              <tbody>
                {result.violations.map((violation, index) => (
                  <tr key={`${violation.code}-${violation.entityId}-${index}`} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">{violation.code}</td>
                    <td className="px-3 py-2">
                      <span className="block">{violation.entityType}</span>
                      <span className="text-xs text-muted-foreground">{violation.entityId}</span>
                    </td>
                    <td className="px-3 py-2">{violation.message}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{violation.expected ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{violation.actual ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
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
