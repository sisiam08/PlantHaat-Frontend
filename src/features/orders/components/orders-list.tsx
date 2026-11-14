"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Package } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format/date";
import { formatBdt } from "@/lib/format/money";
import { queryKeys } from "@/lib/api/query-keys";
import { ordersApi } from "../api";
import type { OrderSummaryView } from "../types";

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "CANCELLED" || status === "FAILED_DELIVERY") {
    return "destructive";
  }
  if (status === "DELIVERED") {
    return "default";
  }
  return "secondary";
}

export function OrdersList() {
  const t = useTranslations("orders");
  const tc = useTranslations("common");
  const tCatalog = useTranslations("catalog");
  const locale = useLocale();

  const orders = useInfiniteQuery({
    queryKey: queryKeys.orders(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => ordersApi.list({ page: pageParam }),
    getNextPageParam: (last) => {
      const meta = last.meta;
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });

  if (orders.isLoading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (orders.isError) {
    return <QueryError message={tc("sectionLoadFailed")} onRetry={() => void orders.refetch()} />;
  }

  const seen = new Set<string>();
  const list: OrderSummaryView[] = [];
  for (const page of orders.data?.pages ?? []) {
    for (const order of page.data) {
      if (seen.has(order.id)) continue;
      seen.add(order.id);
      list.push(order);
    }
  }

  if (list.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title={t("empty")}
        action={
          <Button asChild variant="cta">
            <Link href="/products">{t("startShopping")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-3">
      {list.map((order) => (
        <Card key={order.id} className="rounded-2xl">
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <p className="font-medium">{order.orderNumber}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(order.placedAt, locale)}
              </p>
            </div>
            <Badge variant={statusVariant(order.overallStatus)}>
              {t(`status.${order.overallStatus}`)}
            </Badge>
            <p className="font-semibold">{formatBdt(order.grandTotal, locale)}</p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/orders/${order.id}`}>{t("viewDetails")}</Link>
            </Button>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col items-center gap-2 pt-1">
        {orders.hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            disabled={orders.isFetchingNextPage}
            onClick={() => void orders.fetchNextPage()}
          >
            {orders.isFetchingNextPage ? tc("loading") : tCatalog("loadMore")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
