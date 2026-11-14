"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatBdt } from "@/lib/format/money";
import { adminApi } from "../api";

const RANGES = [7, 30, 90] as const;

export function DashboardClient() {
  const t = useTranslations("admin.dashboard");
  const locale = useLocale();
  const [days, setDays] = useState<number>(30);

  const analytics = useQuery({
    queryKey: queryKeys.admin.analytics({ days }),
    queryFn: () => {
      const from = new Date(Date.now() - days * 86_400_000).toISOString();
      return adminApi.analytics({ from });
    },
    retry: false,
  });

  if (analytics.isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (analytics.isError || !analytics.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const data = analytics.data;
  const maxGmv = data.dailySeries.reduce((max, point) => {
    const value = Number(point.gmv);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={days === value ? "secondary" : "ghost"}
            onClick={() => setDays(value)}
          >
            {t("lastDays", { days: value })}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("gmv")} value={formatBdt(data.gmv, locale)} />
        <Stat label={t("orders")} value={String(data.orderCount)} />
        <Stat label={t("commission")} value={formatBdt(data.commissionEarned, locale)} />
        <Stat label={t("pendingApprovals")} value={String(data.pendingApprovals)} />
        <Stat label={t("newCustomers")} value={String(data.newCustomers)} />
        <Stat label={t("newSellers")} value={String(data.newSellers)} />
        <Stat label={t("cancellationRate")} value={`${data.cancellationRate}%`} />
        <Stat label={t("complaintRate")} value={`${data.complaintRate}%`} />
        <Stat label={t("stuckOrders")} value={String(data.stuckOrders)} />
        <Stat
          label={t("suspendedSellerOpenOrders")}
          value={String(data.suspendedSellerOpenOrders)}
        />
        <Stat label={t("falseDeliveryFlags")} value={String(data.falseDeliveryFlags)} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("dailyGmv")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.dailySeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          ) : data.dailySeries.length === 1 ? (
            <div className="flex h-40 items-center justify-center rounded-xl bg-muted/40">
              <div className="text-center">
                <p className="font-heading text-2xl font-semibold">
                  {formatBdt(data.dailySeries[0].gmv, locale)}
                </p>
                <p className="text-xs text-muted-foreground">{data.dailySeries[0].date}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-end gap-1">
              {data.dailySeries.map((point) => {
                const value = Number(point.gmv);
                const height = maxGmv > 0 ? Math.round((value / maxGmv) * 100) : 0;
                return (
                  <div
                    key={point.date}
                    className="min-w-1 flex-1 rounded-t bg-primary"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${point.date}: ${formatBdt(point.gmv, locale)}`}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t("topShops")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            {data.topShops.length === 0 ? (
              <p className="text-muted-foreground">{t("noData")}</p>
            ) : (
              data.topShops.map((entry, index) => (
                <div key={entry.shop?.id ?? index} className="flex justify-between gap-3">
                  <span className="truncate">{entry.shop?.name ?? "-"}</span>
                  <span className="shrink-0">{formatBdt(entry.total, locale)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t("topProducts")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            {data.topProducts.length === 0 ? (
              <p className="text-muted-foreground">{t("noData")}</p>
            ) : (
              data.topProducts.map((product) => (
                <div key={product.id} className="flex justify-between gap-3">
                  <span className="truncate">{product.name}</span>
                  <span className="shrink-0 text-muted-foreground">{product.soldCount}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("topDistricts")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            {data.topDistricts.length === 0 ? (
              <p className="text-muted-foreground">{t("noData")}</p>
            ) : (
              data.topDistricts.map((entry) => (
                <div key={entry.district} className="flex justify-between gap-3">
                  <span className="truncate">{entry.district}</span>
                  <span className="shrink-0 text-muted-foreground">{entry.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="grid gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-xl font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}
