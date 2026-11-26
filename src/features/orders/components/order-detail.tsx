"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { QueryError } from "@/components/feedback/query-error";
import { PageHeader } from "@/components/layout/page-header";
import { Price } from "@/components/product/price";
import { ProductLine } from "@/components/product/quantity-line";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { formatDateTime } from "@/lib/format/date";
import { formatCount } from "@/lib/format/number";
import { queryKeys } from "@/lib/api/query-keys";
import { paymentsApi } from "@/features/payments/api";
import { PaymentBadge } from "@/features/payments/components/payment-badge";
import { orderSettlementApi, ordersApi } from "../api";
import type { ShopOrderView } from "../types";

const FLOW = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"];

export function OrderDetail({
  orderId,
  earlyRelease = true,
}: {
  orderId: string;
  earlyRelease?: boolean;
}) {
  const t = useTranslations("orders");
  const tCheckout = useTranslations("checkout");
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
    await queryClient.invalidateQueries({ queryKey: queryKeys.orderCounts });
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
    return <QueryError message={tErrors("generic")} onRetry={() => void order.refetch()} />;
  }

  const detail = order.data;

  return (
    <div className="grid gap-5">
      <PageHeader
        title={detail.orderNumber}
        description={`${formatDateTime(detail.placedAt, locale)} · ${
          detail.paymentMethod === "ADVANCE" ? tCheckout("advance") : tCheckout("cod")
        }`}
        actions={<Badge>{t(`status.${detail.overallStatus}`)}</Badge>}
      />

      <Card className="rounded-2xl">
        <CardContent className="grid gap-1 text-sm">
          <p className="font-medium">{detail.contactName}</p>
          <p className="text-muted-foreground">
            {detail.shippingAddressLine}, {detail.shippingArea}, {detail.shippingDistrictName}
          </p>
          <p className="text-muted-foreground">{detail.contactPhone}</p>
        </CardContent>
      </Card>

      {detail.paymentMethod === "ADVANCE" ? <OrderPaymentPanel orderId={detail.id} /> : null}

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
          earlyRelease={earlyRelease}
        />
      ))}

      <Card className="rounded-2xl">
        <CardContent className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span>{t("itemsSubtotal")}</span>
            <span>
              <Price value={detail.subtotal} locale={locale} size="sm" />
            </span>
          </div>
          <div className="text-sm font-medium">{t("delivery")}</div>
          {detail.shopOrders.map((shopOrder) => (
            <div key={shopOrder.id} className="flex justify-between text-muted-foreground">
              <span className="truncate pr-2">{shopOrder.shop.name}</span>
              <span>
                <Price value={shopOrder.deliveryCharge} locale={locale} size="sm" />
              </span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between">
            <span>{t("deliveryTotal")}</span>
            <span>
              <Price value={detail.deliveryTotal} locale={locale} size="sm" />
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>{t("grandTotal")}</span>
            <span>
              <Price value={detail.grandTotal} locale={locale} size="sm" />
            </span>
          </div>
          {detail.shopOrders.length > 1 ? (
            <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              {t("separateShipments", { count: formatCount(detail.shopOrders.length, locale) })}
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

function OrderPaymentPanel({ orderId }: { orderId: string }) {
  const t = useTranslations("orders");
  const tp = useTranslations("payments");
  const locale = useLocale();
  const payment = useQuery({
    queryKey: queryKeys.payment(orderId),
    queryFn: () => paymentsApi.get(orderId),
    retry: 1,
  });

  if (payment.isLoading) {
    return <Skeleton className="h-28 w-full rounded-2xl" />;
  }
  if (payment.isError || !payment.data) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="text-sm text-muted-foreground">{tp("loadError")}</CardContent>
      </Card>
    );
  }
  const info = payment.data;
  const payable =
    info.status === "UNPAID" || info.status === "REJECTED" || info.status === "EXPIRED";
  return (
    <Card className="rounded-2xl" data-order-payment>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("paymentStatus")}</h2>
          <PaymentBadge status={info.status} />
        </div>
        <div className="grid gap-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{tp("amountDue")}</span>
            <Price value={info.amountDue} locale={locale} size="sm" />
          </div>
          {info.paidAmount !== "0" ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tp("status.PAID")}</span>
              <Price value={info.paidAmount} locale={locale} size="sm" />
            </div>
          ) : null}
          {info.refundedAmount !== "0" ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{tp("refundAmount")}</span>
              <Price value={info.refundedAmount} locale={locale} size="sm" />
            </div>
          ) : null}
        </div>
        {info.status === "PENDING_VERIFICATION" ? (
          <p className="text-muted-foreground">
            {tp("pendingBody", {
              trxId: info.submissions[0]?.trxId ?? "",
              verificationText: info.instructions.verificationText,
            })}
          </p>
        ) : null}
        {info.status === "REJECTED" ? (
          <p className="text-destructive">
            {tp("rejectedReason", { reason: info.submissions[0]?.rejectReason ?? "" })}
          </p>
        ) : null}
        {payable ? (
          <Button asChild variant="cta" size="sm" className="w-fit">
            <Link href={`/checkout/payment/${orderId}`}>{tp("completePayment")}</Link>
          </Button>
        ) : null}
        {info.submissions.length > 0 ? (
          <div className="grid gap-1 border-t border-border pt-2">
            <p className="text-xs font-medium text-muted-foreground">{tp("timeline")}</p>
            {info.submissions.map((submission) => (
              <div key={submission.id} className="grid gap-0.5">
                <p className="text-xs text-muted-foreground">
                  {submission.provider} · {submission.trxId} ·{" "}
                  {tp(
                    `status.${
                      submission.status === "VERIFIED"
                        ? "PAID"
                        : submission.status === "REJECTED"
                          ? "REJECTED"
                          : "PENDING_VERIFICATION"
                    }`,
                  )}{" "}
                  · {formatDateTime(submission.createdAt, locale)}
                </p>
                {submission.reviewedAt ? (
                  <p className="text-xs text-muted-foreground">
                    {submission.status === "VERIFIED"
                      ? tp("verifiedAt", { time: formatDateTime(submission.reviewedAt, locale) })
                      : tp("rejectedAt", { time: formatDateTime(submission.reviewedAt, locale) })}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ShopOrderCard({
  shopOrder,
  locale,
  t,
  cancelling,
  onCancel,
  onRequest,
  earlyRelease,
}: {
  shopOrder: ShopOrderView;
  locale: string;
  t: (key: string, values?: Record<string, string | number>) => string;
  cancelling: boolean;
  onCancel: () => void;
  onRequest: () => void;
  earlyRelease: boolean;
}) {
  const activeIndex = FLOW.indexOf(shopOrder.status);
  const terminal = shopOrder.status === "CANCELLED" || shopOrder.status === "FAILED_DELIVERY";

  return (
    <Card className="rounded-2xl">
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {shopOrder.shop.name}
            {shopOrder.kind === "REPLACEMENT" ? (
              <Badge variant="outline">{t("replacement")}</Badge>
            ) : null}
          </p>
          <Badge variant={terminal ? "destructive" : "secondary"}>
            {t(`status.${shopOrder.status}`)}
          </Badge>
        </div>

        {shopOrder.kind === "REPLACEMENT" && shopOrder.parent ? (
          <Link
            href={`/orders/${shopOrder.parent.orderId}`}
            className="inline-flex min-h-11 items-center text-xs text-primary underline-offset-4 hover:underline"
          >
            {t("replacementFor", { number: shopOrder.parent.shopOrderNumber })}
          </Link>
        ) : null}
        {shopOrder.replacements?.length ? (
          <div className="grid gap-1 text-xs">
            {shopOrder.replacements.map((replacement) => (
              <Link
                key={replacement.id}
                href={`/orders/${replacement.orderId}`}
                className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline"
              >
                {t("replacementCreated", { number: replacement.shopOrderNumber })}
              </Link>
            ))}
          </div>
        ) : null}

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

        {shopOrder.deliveryProofs?.length ? (
          <div className="grid gap-2" data-delivery-proofs>
            <span className="text-sm font-medium">
              {locale === "bn" ? "ডেলিভারি প্রমাণ" : "Delivery proof"}
            </span>
            <div className="flex flex-wrap gap-2">
              {shopOrder.deliveryProofs.map((proof) => (
                <a
                  key={proof.id}
                  href={proof.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={locale === "bn" ? "ডেলিভারি প্রমাণ" : "Delivery proof"}
                  className="block size-20 overflow-hidden rounded-lg border border-border/60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={proof.url} alt="" className="size-full object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-2">
          {shopOrder.items.map((item) => (
            <div key={item.id} className="grid gap-2">
              <ProductLine
                name={item.productName}
                variantName={item.variantName}
                quantity={item.quantity}
                unitPrice={item.unitPrice}
                lineTotal={item.lineTotal}
                locale={locale}
              />
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
            <span>
              <Price value={shopOrder.subtotal} locale={locale} size="sm" />
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t("delivery")}</span>
            <span>
              <Price value={shopOrder.deliveryCharge} locale={locale} size="sm" />
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>{t("total")}</span>
            <span>
              <Price value={shopOrder.total} locale={locale} size="sm" />
            </span>
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
        {shopOrder.status === "DELIVERED" ? (
          <ReturnWindowPanel
            shopOrder={shopOrder}
            earlyRelease={earlyRelease}
          />
        ) : null}
        {shopOrder.status === "SHIPPED" || shopOrder.status === "FAILED_DELIVERY" ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/complaints/new?shopOrderId=${shopOrder.id}`}>{t("reportProblem")}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReturnWindowPanel({
  shopOrder,
  earlyRelease,
}: {
  shopOrder: ShopOrderView;
  earlyRelease: boolean;
}) {
  const t = useTranslations("part4.returnWindow");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const initial = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  const release = useMutation({
    mutationFn: () => orderSettlementApi.confirmReceipt(shopOrder.id),
    onSuccess: async () => {
      toast.success(t("released"));
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const releaseAt = shopOrder.releaseAt ? new Date(shopOrder.releaseAt) : null;
  const released = Boolean(shopOrder.fundsReleasedAt);
  const closed = released || (releaseAt !== null && now !== null && now >= releaseAt.getTime());

  if (!releaseAt) {
    return (
      <div className="grid gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
        <p className="font-medium">{t("deliveredTitle")}</p>
        <p className="text-muted-foreground">{t("legacyBody")}</p>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href={`/complaints/new?shopOrderId=${shopOrder.id}`}>{t("report")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
      <p className="font-medium">
        {closed ? t("closedTitle") : t("openTitle")}
      </p>
      <p className="text-muted-foreground">
        {closed
          ? t("closedBody")
          : t("openBody", { date: formatDateTime(releaseAt.toISOString(), locale) })}
      </p>
      {!closed ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/complaints/new?shopOrderId=${shopOrder.id}`}>{t("report")}</Link>
          </Button>
          {earlyRelease ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="cta" size="sm">
                  {t("everythingFine")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("confirmBody")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={release.isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      release.mutate();
                    }}
                  >
                    {t("confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
