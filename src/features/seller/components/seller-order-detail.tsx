"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { formatBdt } from "@/lib/format/money";
import { sellerApi } from "../api";
import { orderStatusVariant } from "../status";
import type { OrderStatus, SellerShopOrderView, TransitionOrderInput } from "../types";

const SELLER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "FAILED_DELIVERY"],
  FAILED_DELIVERY: ["SHIPPED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function SellerOrderDetail({ id }: { id: string }) {
  const t = useTranslations("seller.orders");
  const tStatus = useTranslations("seller.orderStatus");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [etaDays, setEtaDays] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [restock, setRestock] = useState(false);

  const order = useQuery({
    queryKey: queryKeys.seller.order(id),
    queryFn: () => sellerApi.getOrder(id),
    retry: false,
  });

  const transition = useMutation({
    mutationFn: (input: TransitionOrderInput) => sellerApi.transitionOrder(id, input),
    onSuccess: async () => {
      setPending(null);
      setNote("");
      setCourierName("");
      setTrackingCode("");
      setEtaDays("");
      setDeliveryNote("");
      setRestock(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.order(id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.orders() });
      toast.success(t("statusUpdated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (order.isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }
  if (order.isError || !order.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const data: SellerShopOrderView = order.data;
  const allowed = SELLER_TRANSITIONS[data.status] ?? [];

  const confirmTransition = () => {
    if (!pending) return;
    const input: TransitionOrderInput = { status: pending };
    if (note.trim()) input.note = note.trim();
    if (pending === "SHIPPED") {
      if (courierName.trim()) input.courierName = courierName.trim();
      if (trackingCode.trim()) input.trackingCode = trackingCode.trim();
      const days = Number(etaDays);
      if (etaDays.trim() && Number.isFinite(days) && days > 0) {
        input.estimatedDeliveryFrom = new Date().toISOString();
        input.estimatedDeliveryTo = new Date(Date.now() + days * 86_400_000).toISOString();
      }
    }
    if (pending === "DELIVERED" && deliveryNote.trim()) {
      input.deliveryNote = deliveryNote.trim();
    }
    if (pending === "CANCELLED") {
      input.restock = restock;
    }
    transition.mutate(input);
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
            {data.shopOrderNumber}
            {data.kind === "REPLACEMENT" ? (
              <Badge variant="outline">{t("replacement")}</Badge>
            ) : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("orderRef", { number: data.order.orderNumber })} ·{" "}
            {formatDateTime(data.createdAt, locale)}
          </p>
          {data.kind === "REPLACEMENT" && data.parent ? (
            <Link
              href={`/seller/orders/${data.parent.id}`}
              className="text-xs text-primary underline-offset-4 hover:underline"
            >
              {t("replacementFor", { number: data.parent.shopOrderNumber })}
            </Link>
          ) : null}
          {data.replacements?.length ? (
            <div className="grid gap-1 text-xs">
              {data.replacements.map((replacement) => (
                <Link
                  key={replacement.id}
                  href={`/seller/orders/${replacement.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {t("replacementCreated", { number: replacement.shopOrderNumber })}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <Badge variant={orderStatusVariant(data.status)}>{tStatus(data.status)}</Badge>
      </div>

      {data.stuckFlaggedAt ? (
        <p className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {t("stuckWarning")}
        </p>
      ) : null}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("itemsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {data.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3">
              <span>
                {item.productName} · {item.variantName} × {item.quantity}
              </span>
              <span className="shrink-0">{formatBdt(item.lineTotal, locale)}</span>
            </div>
          ))}
          <Separator />
          <div className="grid gap-1">
            <Row label={t("subtotal")} value={formatBdt(data.subtotal, locale)} />
            <Row label={t("delivery")} value={formatBdt(data.deliveryCharge, locale)} />
            <Row label={t("commission")} value={formatBdt(data.commissionAmount, locale)} />
            <div className="flex justify-between font-semibold">
              <span>{t("total")}</span>
              <span>{formatBdt(data.total, locale)}</span>
            </div>
            <Row label={t("net")} value={formatBdt(data.sellerNetAmount, locale)} />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("deliveryInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p className="text-muted-foreground">
            {t("payment")}: {data.order.paymentMethod}
          </p>
          {data.courierName || data.trackingCode ? (
            <p className="text-muted-foreground">
              {data.courierName ?? "-"} · {data.trackingCode ?? "-"}
            </p>
          ) : null}
          {data.estimatedDeliveryTo ? (
            <p className="text-muted-foreground">
              {t("eta")}: {formatDateTime(data.estimatedDeliveryTo, locale)}
            </p>
          ) : null}
          {data.deliveryNote ? (
            <p className="text-muted-foreground">
              {t("deliveryNote")}: {data.deliveryNote}
            </p>
          ) : null}
          {data.cancelReason ? (
            <p className="text-destructive">
              {t("cancelReason")}: {data.cancelReason}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {allowed.length > 0 ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t("actions")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              {allowed.map((status) => (
                <Button
                  key={status}
                  type="button"
                  variant={
                    status === "CANCELLED" || status === "FAILED_DELIVERY" ? "outline" : "cta"
                  }
                  onClick={() => setPending(status)}
                >
                  {t(`actions_${status}`)}
                </Button>
              ))}
            </div>

            {pending ? (
              <div className="grid gap-3 rounded-xl border border-border p-3">
                {pending === "SHIPPED" ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="courierName">{t("courierName")}</Label>
                      <Input
                        id="courierName"
                        value={courierName}
                        onChange={(event) => setCourierName(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="trackingCode">{t("trackingCode")}</Label>
                      <Input
                        id="trackingCode"
                        value={trackingCode}
                        onChange={(event) => setTrackingCode(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="etaDays">{t("etaDays")}</Label>
                      <Input
                        id="etaDays"
                        inputMode="numeric"
                        value={etaDays}
                        onChange={(event) => setEtaDays(event.target.value)}
                      />
                    </div>
                  </div>
                ) : null}

                {pending === "DELIVERED" ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="deliveryNote">{t("deliveryNoteOptional")}</Label>
                    <Input
                      id="deliveryNote"
                      value={deliveryNote}
                      maxLength={500}
                      onChange={(event) => setDeliveryNote(event.target.value)}
                    />
                  </div>
                ) : null}

                <div className="grid gap-1.5">
                  <Label htmlFor="transitionNote">{t("note")}</Label>
                  <Input
                    id="transitionNote"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>

                {pending === "CANCELLED" ? (
                  <div className="flex items-center gap-3">
                    <Switch checked={restock} onCheckedChange={setRestock} id="restock" />
                    <Label htmlFor="restock">{t("restock")}</Label>
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="cta"
                    disabled={transition.isPending || (pending === "CANCELLED" && note.trim().length < 3)}
                    onClick={confirmTransition}
                  >
                    {t("confirmAction", { status: tStatus(pending) })}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setPending(null)}>
                    {t("cancelAction")}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {data.statusHistory.length === 0 ? (
            <p className="text-muted-foreground">{t("noHistory")}</p>
          ) : (
            data.statusHistory.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between gap-3">
                <span>
                  <span className="font-medium">{tStatus(entry.toStatus)}</span>
                  {entry.note ? (
                    <span className="text-muted-foreground"> — {entry.note}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(entry.createdAt, locale)}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
