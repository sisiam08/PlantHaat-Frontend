"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "../api";

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function ReconciliationClient() {
  const t = useTranslations("admin.reconciliation");
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

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? (
        <p className="text-sm text-muted-foreground">{t("loadError")}</p>
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
