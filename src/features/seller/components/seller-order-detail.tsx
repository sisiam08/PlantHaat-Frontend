"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Price } from "@/components/product/price";
import { ProductLine } from "@/components/product/quantity-line";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toastApiError } from "@/features/auth/components/error-toast";
import { uploadsApi } from "@/features/uploads/api";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { PaymentBadge } from "@/features/payments/components/payment-badge";
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
  const tp4 = useTranslations("part4.sellerOrder");
  const tStatus = useTranslations("seller.orderStatus");
  const tErrors = useTranslations("errors");
  const tp = useTranslations("payments");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [etaDays, setEtaDays] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [deliveryProofUrls, setDeliveryProofUrls] = useState<string[]>([]);
  const [proofUploading, setProofUploading] = useState(false);
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
      setDeliveryProofUrls([]);
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
  const settlement = data as SellerShopOrderView & {
    releaseAt?: string | null;
    fundsReleasedAt?: string | null;
  };
  const paymentBlocked =
    data.order.paymentMethod === "ADVANCE" && data.order.paymentStatus !== "PAID";

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
    if (pending === "DELIVERED" && deliveryProofUrls.length > 0) {
      input.deliveryProofUrls = deliveryProofUrls;
    }
    if (pending === "CANCELLED") {
      input.restock = restock;
    }
    transition.mutate(input);
  };

  return (
    <div className="grid gap-5">
      <PageHeader
        title={data.shopOrderNumber}
        description={`${t("orderRef", { number: data.order.orderNumber })} · ${formatDateTime(data.createdAt, locale)}`}
        back={
          <Link
            href="/seller/orders"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline"
          >
            {t("backToOrders")}
          </Link>
        }
        actions={
          <>
            {data.codRisk && data.codRisk !== "OK" ? (
              <Badge variant="destructive">{t("codRiskBadge")}</Badge>
            ) : null}
            <Badge variant={orderStatusVariant(data.status)}>{tStatus(data.status)}</Badge>
            {data.order.paymentMethod === "ADVANCE" ? (
              <PaymentBadge status={data.order.paymentStatus === "PAID" ? "PAID" : "UNPAID"} />
            ) : null}
          </>
        }
      />
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
            <ProductLine
              key={item.id}
              name={item.productName}
              variantName={item.variantName}
              quantity={item.quantity}
              unitPrice={item.unitPrice}
              lineTotal={item.lineTotal}
              locale={locale}
            />
          ))}
          <Separator />
          <div className="grid gap-1">
            <Row
              label={t("subtotal")}
              value={<Price value={data.subtotal} locale={locale} size="sm" />}
            />
            <Row
              label={t("delivery")}
              value={<Price value={data.deliveryCharge} locale={locale} size="sm" />}
            />
            <Row
              label={t("commission")}
              value={<Price value={data.commissionAmount} locale={locale} size="sm" />}
            />
            <div className="flex justify-between font-semibold">
              <span>{t("total")}</span>
              <span>
                <Price value={data.total} locale={locale} size="sm" />
              </span>
            </div>
            <Row
              label={t("net")}
              value={<Price value={data.sellerNetAmount} locale={locale} size="sm" />}
            />
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
          {settlement.deliveredAt && settlement.releaseAt ? (
            <p className="text-muted-foreground">
              {settlement.fundsReleasedAt
                ? tp4("fundsReleased", {
                    date: formatDateTime(settlement.fundsReleasedAt, locale),
                  })
                : tp4("releaseAt", {
                    date: formatDateTime(settlement.releaseAt, locale),
                  })}
            </p>
          ) : null}
          {data.deliveryNote ? (
            <p className="text-muted-foreground">
              {t("deliveryNote")}: {data.deliveryNote}
            </p>
          ) : null}
          {data.deliveryProofs?.length ? (
            <div className="flex flex-wrap gap-2" data-delivery-proofs>
              {data.deliveryProofs.map((proof) => (
                <a
                  key={proof.id}
                  href={proof.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("deliveryProof")}
                  className="block size-20 overflow-hidden rounded-lg border border-border/60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proof.url} alt="" className="size-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
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
            {paymentBlocked ? (
              <div className="grid gap-1 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
                <span className="flex items-center gap-2 font-medium">
                  <PaymentBadge status="UNPAID" />
                  {tp("sellerWaiting")}
                </span>
                <span>{tp("sellerBlocked")}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {allowed.map((status) => {
                const blocked =
                  paymentBlocked && status !== "CANCELLED" && status !== "FAILED_DELIVERY";
                return (
                  <Button
                    key={status}
                    type="button"
                    variant={
                      status === "CANCELLED" || status === "FAILED_DELIVERY" ? "outline" : "cta"
                    }
                    disabled={blocked}
                    title={blocked ? tp("sellerBlocked") : undefined}
                    onClick={() => setPending(status)}
                  >
                    {t(`actions_${status}`)}
                  </Button>
                );
              })}
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
                  <div className="grid gap-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor="deliveryNote">{t("deliveryNoteOptional")}</Label>
                      <Input
                        id="deliveryNote"
                        value={deliveryNote}
                        maxLength={500}
                        onChange={(event) => setDeliveryNote(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="deliveryProof">{t("deliveryProof")}</Label>
                      <p className="text-xs text-muted-foreground">{t("deliveryProofHelp")}</p>
                      <Input
                        id="deliveryProof"
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={proofUploading || deliveryProofUrls.length >= 3}
                        onChange={async (event) => {
                          const files = Array.from(event.target.files ?? []).slice(
                            0,
                            3 - deliveryProofUrls.length,
                          );
                          event.target.value = "";
                          if (files.length === 0) return;
                          setProofUploading(true);
                          try {
                            const uploaded: string[] = [];
                            for (const file of files) {
                              const stored = await uploadsApi.image(file, "delivery-proof");
                              uploaded.push(stored.url);
                            }
                            setDeliveryProofUrls((current) =>
                              [...current, ...uploaded].slice(0, 3),
                            );
                          } catch (error) {
                            toastApiError(error, tErrors);
                          } finally {
                            setProofUploading(false);
                          }
                        }}
                      />
                      {deliveryProofUrls.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {deliveryProofUrls.map((url) => (
                            <button
                              key={url}
                              type="button"
                              className="size-16 overflow-hidden rounded-lg border border-border/60"
                              onClick={() =>
                                setDeliveryProofUrls((current) =>
                                  current.filter((item) => item !== url),
                                )
                              }
                              aria-label={t("deliveryProofRemove")}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt="" className="size-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
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
                    disabled={
                      transition.isPending || (pending === "CANCELLED" && note.trim().length < 3)
                    }
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

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
