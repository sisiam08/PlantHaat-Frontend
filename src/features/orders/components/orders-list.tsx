"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format/date";
import { formatBdt } from "@/lib/format/money";
import { queryKeys } from "@/lib/api/query-keys";
import { ordersApi } from "../api";

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
  const locale = useLocale();
  const orders = useQuery({ queryKey: queryKeys.orders(), queryFn: () => ordersApi.list() });

  if (orders.isLoading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const list = orders.data?.data ?? [];
  if (list.length === 0) {
    return (
      <Card className="grid place-items-center gap-3 rounded-2xl p-10 text-center">
        <p className="font-medium">{t("empty")}</p>
        <Button asChild variant="cta">
          <Link href="/products">{t("startShopping")}</Link>
        </Button>
      </Card>
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
    </div>
  );
}
