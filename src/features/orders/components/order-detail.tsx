"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { formatDateTime } from "@/lib/format/date";
import { formatBdt } from "@/lib/format/money";
import { queryKeys } from "@/lib/api/query-keys";
import { ordersApi } from "../api";
import type { ShopOrderView } from "../types";

const FLOW = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];

export function OrderDetail({ orderId }: { orderId: string }) {
  const t = useTranslations("orders");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const order = useQuery({
    queryKey: queryKeys.order(orderId),
    queryFn: () => ordersApi.get(orderId),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
  };

  const cancel = useMutation({
    mutationFn: (shopOrderId: string) => ordersApi.cancelShopOrder(shopOrderId),
    onSuccess: refresh,
    onError: (error) => toastApiError(error, tErrors),
  });
  const requestCancellation = useMutation({
    mutationFn: ({ id, reason: text }: { id: string; reason: string }) =>
      ordersApi.requestCancellation(id, text),
    onSuccess: async () => {
      setReasonFor(null);
      setReason("");
      toast.success(t("cancellationRequested"));
      await refresh();
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (order.isLoading) {
    return <Skeleton className="h-52 w-full rounded-2xl" />;
  }
  if (order.isError || !order.data) {
    return <p className="text-sm text-muted-foreground">{tErrors("generic")}</p>;
  }

  const detail = order.data;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{detail.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(detail.placedAt, locale)} · {detail.paymentMethod}
          </p>
        </div>
        <Badge>{t(`status.${detail.overallStatus}`)}</Badge>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="grid gap-1 text-sm">
          <p className="font-medium">{detail.contactName}</p>
          <p className="text-muted-foreground">
            {detail.shippingAddressLine}, {detail.shippingArea}, {detail.shippingDistrictName}
          </p>
          <p className="text-muted-foreground">{detail.contactPhone}</p>
        </CardContent>
      </Card>

      {detail.shopOrders.map((shopOrder) => (
        <ShopOrderCard
          key={shopOrder.id}
          shopOrder={shopOrder}
          locale={locale}
          t={t}
          cancelling={cancel.isPending}
          onCancel={() => {
            if (window.confirm(t("cancelConfirm"))) {
              cancel.mutate(shopOrder.id);
            }
          }}
          onRequest={() => setReasonFor(shopOrder.id)}
        />
      ))}

      <Card className="rounded-2xl">
        <CardContent className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span>{t("itemsSubtotal")}</span>
            <span>{formatBdt(detail.subtotal, locale)}</span>
          </div>
          <div className="text-sm font-medium">{t("delivery")}</div>
          {detail.shopOrders.map((shopOrder) => (
            <div key={shopOrder.id} className="flex justify-between text-muted-foreground">
              <span className="truncate pr-2">{shopOrder.shop.name}</span>
              <span>{formatBdt(shopOrder.deliveryCharge, locale)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between">
            <span>{t("deliveryTotal")}</span>
            <span>{formatBdt(detail.deliveryTotal, locale)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>{t("grandTotal")}</span>
            <span>{formatBdt(detail.grandTotal, locale)}</span>
          </div>
          {detail.shopOrders.length > 1 ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              {t("separateShipments", { count: detail.shopOrders.length })}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {reasonFor ? (
        <Card className="rounded-2xl">
          <CardContent className="grid gap-3">
            <p className="font-medium">{t("cancellationReason")}</p>
            <Input value={reason} onChange={(event) => setReason(event.target.value)} />
            <div className="flex gap-2">
              <Button
                variant="cta"
                disabled={reason.trim().length < 3 || requestCancellation.isPending}
                onClick={() => requestCancellation.mutate({ id: reasonFor, reason: reason.trim() })}
              >
                {t("submitCancellation")}
              </Button>
              <Button variant="ghost" onClick={() => setReasonFor(null)}>
                {t("cancelConfirmNo")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function ShopOrderCard({
  shopOrder,
  locale,
  t,
  cancelling,
  onCancel,
  onRequest,
}: {
  shopOrder: ShopOrderView;
  locale: string;
  t: (key: string) => string;
  cancelling: boolean;
  onCancel: () => void;
  onRequest: () => void;
}) {
  const activeIndex = FLOW.indexOf(shopOrder.status);
  const terminal = shopOrder.status === "CANCELLED" || shopOrder.status === "FAILED_DELIVERY";

  return (
    <Card className="rounded-2xl">
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">{shopOrder.shop.name}</p>
          <Badge variant={terminal ? "destructive" : "secondary"}>
            {t(`status.${shopOrder.status}`)}
          </Badge>
        </div>

        {!terminal ? (
          <ol className="flex flex-wrap items-center gap-2 text-xs">
            {FLOW.map((step, index) => (
              <li
                key={step}
                className={
                  index <= activeIndex ? "font-medium text-primary" : "text-muted-foreground"
                }
              >
                {t(`status.${step}`)}
                {index < FLOW.length - 1 ? <span className="mx-1">›</span> : null}
              </li>
            ))}
          </ol>
        ) : null}

        {shopOrder.courierName || shopOrder.trackingCode ? (
          <p className="text-sm text-muted-foreground">
            {shopOrder.courierName} {shopOrder.trackingCode}
          </p>
        ) : null}

        <div className="grid gap-2">
          {shopOrder.items.map((item) => (
            <div key={item.id} className="grid gap-2">
              <div className="flex justify-between text-sm">
                <span>
                  {item.productName} · {item.variantName} × {item.quantity}
                </span>
                <span>{formatBdt(item.lineTotal, locale)}</span>
              </div>
              {shopOrder.status === "DELIVERED" ? (
                <ReviewForm orderItemId={item.id} productName={item.productName} />
              ) : null}
            </div>
          ))}
        </div>

        <Separator />
        <div className="grid gap-1 text-sm">
          <div className="flex justify-between">
            <span>{t("itemsSubtotal")}</span>
            <span>{formatBdt(shopOrder.subtotal, locale)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("delivery")}</span>
            <span>{formatBdt(shopOrder.deliveryCharge, locale)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>{t("total")}</span>
            <span>{formatBdt(shopOrder.total, locale)}</span>
          </div>
        </div>

        {shopOrder.status === "PENDING" ? (
          <Button variant="outline" disabled={cancelling} onClick={onCancel}>
            {t("cancel")}
          </Button>
        ) : null}
        {shopOrder.status === "CONFIRMED" || shopOrder.status === "PACKED" ? (
          <Button variant="outline" onClick={onRequest}>
            {t("cancellationRequest")}
          </Button>
        ) : null}
        {shopOrder.status !== "CANCELLED" ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/complaints/new?shopOrderId=${shopOrder.id}`}>{t("reportProblem")}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
