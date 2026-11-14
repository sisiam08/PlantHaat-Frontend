"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Price } from "@/components/product/price";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { orderStatusVariant } from "../status";
import type { OrderStatus } from "../types";
import { Pager } from "./pager";

const PAGE_SIZE = 20;
const FILTERS: ("ALL" | OrderStatus)[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
];

export function OrdersList({
  initialStatus,
  initialPage,
}: {
  initialStatus: string;
  initialPage: number;
}) {
  const t = useTranslations("admin.orders");
  const tStatus = useTranslations("admin.orderStatus");
  const tCommon = useTranslations("admin.common");
  const locale = useLocale();
  const router = useRouter();

  const status = FILTERS.includes(initialStatus as "ALL" | OrderStatus)
    ? (initialStatus as "ALL" | OrderStatus)
    : "ALL";
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: queryKeys.admin.orders({ status, page }),
    queryFn: () =>
      adminApi.listOrders({
        status: status === "ALL" ? undefined : status,
        page,
        limit: PAGE_SIZE,
      }),
    retry: false,
  });

  const go = (nextStatus: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/admin/orders?${qs}` : "/admin/orders");
  };

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={status === filter ? "secondary" : "ghost"}
            onClick={() => go(filter, 1)}
          >
            {filter === "ALL" ? tCommon("all") : tStatus(filter)}
          </Button>
        ))}
      </div>

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((order) => (
          <Card key={order.id} className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                    {order.shopOrderNumber}
                  </Link>
                  <Badge variant={orderStatusVariant(order.status)}>{tStatus(order.status)}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {order.shop.name} · {order.order.orderNumber} · {order.items.length} {t("items")}
                </span>
                <span className="text-xs text-muted-foreground">
                  <Price value={order.total} locale={locale} size="sm" /> ·{" "}
                  {formatLatinDateTime(order.createdAt)}
                </span>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/orders/${order.id}`}>{t("view")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {meta ? (
        <Pager page={meta.page} totalPages={meta.totalPages} onPage={(p) => go(status, p)} />
      ) : null}
    </div>
  );
}
