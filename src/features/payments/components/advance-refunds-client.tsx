"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import { Price } from "@/components/product/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { paymentsApi, type RefundObligationRow } from "../api";
import { formatDateTime } from "@/lib/format/date";
import { queryKeys } from "@/lib/api/query-keys";

export function AdvanceRefundsClient() {
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [row, setRow] = useState<RefundObligationRow | null>(null);

  const list = useQuery({
    queryKey: queryKeys.admin.advanceRefunds,
    queryFn: paymentsApi.admin.refunds,
    retry: 1,
  });

  const complete = useMutation({
    mutationFn: ({ id, trxId }: { id: string; trxId: string }) =>
      paymentsApi.admin.completeRefund(id, trxId),
    onSuccess: async () => {
      setRow(null);
      toast.success(t("refundDone"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.advanceRefunds });
      await queryClient.invalidateQueries({ queryKey: ["admin", "advance-payments"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{t("refundQueueTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("refundQueueSubtitle")}</p>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-28 w-full rounded-2xl" />
      ) : list.isError ? (
        <QueryError message={t("loadError")} onRetry={() => void list.refetch()} />
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState icon={RotateCcw} title={t("emptyRefunds")} />
      ) : (
        <div className="grid gap-3">
          {(list.data ?? []).map((item) => (
            <div
              key={item.id}
              className="grid gap-2 rounded-2xl border border-border bg-card p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  className="font-medium text-primary hover:underline"
                  href={`/admin/orders/${item.intent.orderId}`}
                >
                  {item.intent.order.orderNumber}
                </Link>
                <Badge variant={item.status === "REFUND_REQUIRED" ? "destructive" : "secondary"}>
                  {item.status === "REFUND_REQUIRED"
                    ? t("refundRequired")
                    : t("refundPayable")}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {item.intent.order.customer.name} · {formatDateTime(item.createdAt, locale)}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">{t("refundAmount")}</span>
                <Price value={item.amount} locale={locale} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">{item.reason}</p>
              <Button
                type="button"
                variant="cta"
                size="sm"
                className="w-fit"
                onClick={() => setRow(item)}
              >
                {t("completeRefund")}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(row)} onOpenChange={(open) => !open && setRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("completeRefund")}</DialogTitle>
            <DialogDescription>
              {row
                ? t("refundDialogBody", { amount: `${row.amount}` })
                : null}
            </DialogDescription>
          </DialogHeader>
          <RefundForm
            amount={row?.amount}
            locale={locale}
            pending={complete.isPending}
            onCancel={() => setRow(null)}
            onSubmit={(trxId) => {
              if (row) complete.mutate({ id: row.id, trxId });
            }}
            labels={{
              trxId: t("refundTrxId"),
              confirm: t("refundConfirm"),
              cancel: tc("cancel"),
              amount: t("refundAmount"),
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RefundForm({
  amount,
  locale,
  pending,
  onCancel,
  onSubmit,
  labels,
}: {
  amount?: string;
  locale: string;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (trxId: string) => void;
  labels: { trxId: string; confirm: string; cancel: string; amount: string };
}) {
  const [trxId, setTrxId] = useState("");
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(trxId.trim().toUpperCase());
      }}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{labels.amount}</span>
        <Price value={amount} locale={locale} size="sm" />
      </div>
      <Label htmlFor="refundTrxId">{labels.trxId}</Label>
      <Input
        id="refundTrxId"
        value={trxId}
        onChange={(event) => setTrxId(event.target.value)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        dir="ltr"
        className="font-mono uppercase"
      />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {labels.cancel}
        </Button>
        <Button type="submit" variant="cta" disabled={pending || trxId.trim().length < 4}>
          {labels.confirm}
        </Button>
      </DialogFooter>
    </form>
  );
}
