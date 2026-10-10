"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatBdt } from "@/lib/format/money";
import { sellerApi } from "../api";

const RANGES = [7, 30, 90] as const;

export function AnalyticsClient() {
  const t = useTranslations("seller.analytics");
  const tStatus = useTranslations("seller.orderStatus");
  const locale = useLocale();
  const [days, setDays] = useState<number>(30);

  const analytics = useQuery({
    queryKey: queryKeys.seller.analytics({ days }),
    queryFn: () => {
      const from = new Date(Date.now() - days * 86_400_000).toISOString();
      return sellerApi.getAnalytics({ from });
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
  const maxRevenue = data.dailySeries.reduce((max, point) => {
    const value = Number(point.revenue);
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
        <Stat label={t("deliveredOrders")} value={String(data.deliveredOrders)} />
        <Stat label={t("revenue")} value={formatBdt(data.revenue, locale)} />
        <Stat label={t("commissionPaid")} value={formatBdt(data.commissionPaid, locale)} />
        <Stat label={t("averageOrderValue")} value={formatBdt(data.averageOrderValue, locale)} />
        <Stat
          label={t("rating")}
          value={`${Number(data.rating.avg || 0).toFixed(1)} (${data.rating.count})`}
        />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("dailyRevenue")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.dailySeries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            <div className="flex h-40 items-end gap-1">
              {data.dailySeries.map((point) => {
                const value = Number(point.revenue);
                const height = maxRevenue > 0 ? Math.round((value / maxRevenue) * 100) : 0;
                return (
                  <div
                    key={point.date}
                    className="min-w-1 flex-1 rounded-t bg-primary"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${point.date}: ${formatBdt(point.revenue, locale)}`}
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
            <CardTitle>{t("ordersByStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            {Object.entries(data.ordersByStatus).length === 0 ? (
              <p className="text-muted-foreground">{t("noData")}</p>
            ) : (
              Object.entries(data.ordersByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="text-muted-foreground">{tStatus(status)}</span>
                  <span>{count}</span>
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
            <CardTitle>{t("lowStock")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1 text-sm">
            {data.lowStock.length === 0 ? (
              <p className="text-muted-foreground">{t("noLowStock")}</p>
            ) : (
              data.lowStock.map((variant) => (
                <div key={variant.id} className="flex justify-between gap-3">
                  <span className="truncate">
                    {variant.product.name} · {variant.name}
                  </span>
                  <span className="shrink-0 text-destructive">
                    {variant.stockQty} / {variant.lowStockThreshold}
                  </span>
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
