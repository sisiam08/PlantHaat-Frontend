"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Price } from "@/components/product/price";
import { ProductLine } from "@/components/product/quantity-line";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { orderStatusVariant, paymentStatusVariant } from "../status";
import type { OrderStatus } from "../types";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "FAILED_DELIVERY",
];

export function OrderDetail({ id, cancelId }: { id: string; cancelId?: string }) {
  const t = useTranslations("admin.orders");
  const tStatus = useTranslations("admin.orderStatus");
  const tPayment = useTranslations("admin.paymentStatus");
  const tErrors = useTranslations("errors");
  const tp4 = useTranslations("part4.legacy");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [cancelNote, setCancelNote] = useState("");

  const order = useQuery({
    queryKey: queryKeys.admin.orders({ id }),
    queryFn: () => adminApi.getOrder(id),
    retry: false,
  });

  const transition = useMutation({
    mutationFn: (status: OrderStatus) =>
      adminApi.transitionOrder(id, { status, note: note.trim() || undefined }),
    onSuccess: async () => {
      setNextStatus("");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders({ id }) });
      toast.success(t("statusUpdated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const respond = useMutation({
    mutationFn: (approve: boolean) =>
      adminApi.respondCancellation(cancelId ?? "", {
        approve,
        note: cancelNote.trim() || undefined,
      }),
    onSuccess: async () => {
      setCancelNote("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders() });
      toast.success(t("cancellationResponded"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (order.isLoading) {
    return <Skeleton className="h-64 w-full rounded-2xl" />;
  }
  if (order.isError || !order.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const data = order.data;
  const settlement = data as typeof data & { releaseAt?: string | null; fundsReleasedAt?: string | null };
  const legacySettled = data.status === "DELIVERED" && !settlement.releaseAt;

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
            {t("orderRef", { number: data.order.orderNumber })} · {data.shop.name} ·{" "}
            {formatDateTime(data.createdAt, locale)}
          </p>
          {data.kind === "REPLACEMENT" && data.parent ? (
            <Link
              href={`/admin/orders/${data.parent.id}`}
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
                  href={`/admin/orders/${replacement.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {t("replacementCreated", { number: replacement.shopOrderNumber })}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {data.codRisk && data.codRisk !== "OK" ? (
            <Badge variant="destructive">{t("codRiskBadge")}</Badge>
          ) : null}
          <Badge variant={orderStatusVariant(data.status)}>{tStatus(data.status)}</Badge>
        </div>
      </div>

      {data.stuckFlaggedAt ? (
        <p className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {t("stuckWarning")}
        </p>
      ) : null}

      {legacySettled ? (
        <p className="rounded-2xl border border-border bg-secondary/30 px-4 py-3 text-sm">
          <span className="font-medium">{tp4("orderLabel")}</span> — {tp4("orderHelp")}
        </p>
      ) : null}

      {data.deliveryNote ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm">
          <span className="font-medium">{t("deliveryNote")}:</span> {data.deliveryNote}
        </p>
      ) : null}

      {cancelId ? (
        <Card className="rounded-2xl border-cta/50">
          <CardHeader>
            <CardTitle>{t("cancellationRequest")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="cancelNote">{t("note")}</Label>
              <Textarea
                id="cancelNote"
                rows={2}
                value={cancelNote}
                onChange={(event) => setCancelNote(event.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="cta"
                disabled={respond.isPending}
                onClick={() => respond.mutate(true)}
              >
                {t("approveCancellation")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={respond.isPending}
                onClick={() => respond.mutate(false)}
              >
                {t("rejectCancellation")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("items")}</CardTitle>
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
            {data.courierCharge != null ? (
              <Row
                label={t("courierCharge")}
                value={<Price value={data.courierCharge} locale={locale} size="sm" />}
              />
            ) : null}
            {data.sellerExtraCharge != null && Number(data.sellerExtraCharge) > 0 ? (
              <Row
                label={t("sellerExtraCharge")}
                value={<Price value={data.sellerExtraCharge} locale={locale} size="sm" />}
              />
            ) : null}
            {data.parcelWeightKg != null ? (
              <Row label={t("parcelWeight")} value={`${data.parcelWeightKg} kg`} />
            ) : null}
            {data.courierLane ? <Row label={t("courierLane")} value={data.courierLane} /> : null}
            {data.quoteSource ? (
              <Row label={t("quoteSource")} value={data.quoteSource} />
            ) : null}
            {data.freeDeliveryApplied ? (
              <Row label={t("freeDeliveryApplied")} value={t("yes")} />
            ) : null}
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
              label={t("sellerNet")}
              value={<Price value={data.sellerNetAmount} locale={locale} size="sm" />}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("payments")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {data.payments.length === 0 ? (
            <p className="text-muted-foreground">{t("noPayments")}</p>
          ) : (
            data.payments.map((payment) => (
              <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {payment.method} · <Price value={payment.amount} locale={locale} size="sm" />
                </span>
                <Badge variant={paymentStatusVariant(payment.status)}>
                  {tPayment(payment.status)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("overrideStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="adminStatus">{t("newStatus")}</Label>
            <select
              id="adminStatus"
              className="h-10 rounded-full border border-input bg-background px-4 text-sm"
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as OrderStatus | "")}
            >
              <option value="">{t("selectStatus")}</option>
              {STATUSES.filter((status) => status !== data.status).map((status) => (
                <option key={status} value={status}>
                  {tStatus(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="adminNote">{t("note")}</Label>
            <Textarea
              id="adminNote"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="cta"
            className="w-fit"
            disabled={transition.isPending || nextStatus === ""}
            onClick={() => {
              if (nextStatus) transition.mutate(nextStatus);
            }}
          >
            {t("applyStatus")}
          </Button>
        </CardContent>
      </Card>

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
                  <span className="font-medium">{tStatus(entry.toStatus as OrderStatus)}</span>
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

