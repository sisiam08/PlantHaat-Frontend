"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Price } from "@/components/product/price";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { PaymentBadge } from "@/features/payments/components/payment-badge";
import { sellerApi } from "../api";
import { orderStatusVariant } from "../status";

const PAGE_SIZE = 20;

const FILTERS = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
] as const;

export function SellerOrdersList({
  initialStatus,
  initialPage,
}: {
  initialStatus: string;
  initialPage: number;
}) {
  const t = useTranslations("seller.orders");
  const tStatus = useTranslations("seller.orderStatus");
  const locale = useLocale();
  const router = useRouter();

  const activeStatus = (FILTERS as readonly string[]).includes(initialStatus)
    ? initialStatus
    : "ALL";
  const page = Math.max(1, initialPage);

  const orders = useQuery({
    queryKey: queryKeys.seller.orders({ status: activeStatus, page }),
    queryFn: () =>
      sellerApi.listOrders({
        status: activeStatus === "ALL" ? undefined : activeStatus,
        page,
        limit: PAGE_SIZE,
      }),
    retry: false,
  });

  const go = (status: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/seller/orders?${qs}` : "/seller/orders");
  };

  const items = orders.data?.data ?? [];
  const meta = orders.data?.meta;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={activeStatus === filter ? "secondary" : "ghost"}
            onClick={() => go(filter, 1)}
          >
            {filter === "ALL" ? t("all") : tStatus(filter)}
          </Button>
        ))}
      </div>

      {orders.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : null}

      {orders.isError ? (
        <QueryError message={t("loadError")} onRetry={() => void orders.refetch()} />
      ) : null}

      {!orders.isLoading && !orders.isError && items.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : null}

      <div className="grid gap-3">
        {items.map((order) => (
          <Card key={order.id} className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{order.shopOrderNumber}</span>
                  <Badge variant={orderStatusVariant(order.status)}>{tStatus(order.status)}</Badge>
                  {order.order.paymentMethod === "ADVANCE" ? (
                    <PaymentBadge
                      status={order.order.paymentStatus === "PAID" ? "PAID" : "UNPAID"}
                    />
                  ) : null}
                  {order.codRisk && order.codRisk !== "OK" ? (
                    <Badge variant="destructive">{t("codRiskBadge")}</Badge>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {order.order.orderNumber} · {formatDateTime(order.createdAt, locale)} ·{" "}
                  {order.items.length} {t("items")}
                </span>
              </div>
              <span className="font-semibold">
                <Price value={order.total} locale={locale} size="sm" />
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href={`/seller/orders/${order.id}`}>{t("viewDetails")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {meta && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => go(activeStatus, page - 1)}
          >
            {t("prev")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pageOf", { page: meta.page, total: meta.totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= meta.totalPages}
            onClick={() => go(activeStatus, page + 1)}
          >
            {t("next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
