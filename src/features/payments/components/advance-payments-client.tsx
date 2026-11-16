"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, ImageOff, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import { Price } from "@/components/product/price";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { paymentsApi, type AdminPaymentRow } from "../api";
import { PaymentBadge } from "./payment-badge";
import { formatDateTime } from "@/lib/format/date";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";

type Filter = "all" | "pending" | "sla";

function providerLabel(provider: string): string {
  return provider === "BKASH" ? "bKash" : "Nagad";
}

export function AdvancePaymentsClient() {
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("pending");
  const [verifyRow, setVerifyRow] = useState<AdminPaymentRow | null>(null);
  const [rejectRow, setRejectRow] = useState<AdminPaymentRow | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const list = useQuery({
    queryKey: queryKeys.admin.advancePayments(filter),
    queryFn: () => paymentsApi.admin.list(filter === "all" ? undefined : filter),
    retry: 1,
  });

  const refunds = useQuery({
    queryKey: queryKeys.admin.advanceRefunds,
    queryFn: paymentsApi.admin.refunds,
    retry: 1,
  });

  const rows = [...(list.data ?? [])].sort((a, b) => {
    const rank = (row: AdminPaymentRow) =>
      row.underSla ? 0 : row.status === "PENDING_VERIFICATION" ? 1 : 2;
    return rank(a) - rank(b);
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "advance-payments"] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.advanceRefunds });
    await queryClient.invalidateQueries({ queryKey: ["admin", "analytics"] });
  };

  const verify = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      paymentsApi.admin.verify(id, amount),
    onSuccess: async (result) => {
      setVerifyRow(null);
      if (result.status === "UNDERPAID") {
        toast.warning(t("verifiedUnder", { amount: result.remainingAmount }));
      } else if (result.overpaidAmount && result.overpaidAmount !== "0") {
        toast.success(t("verifiedOver", { amount: result.overpaidAmount }));
      } else {
        toast.success(t("verifiedExact"));
      }
      await invalidate();
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      paymentsApi.admin.reject(id, reason),
    onSuccess: async () => {
      setRejectRow(null);
      toast.success(t("rejected"));
      await invalidate();
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const refundCount = refunds.data?.length ?? 0;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("adminQueueTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("adminQueueSubtitle")}</p>
        </div>
        <Button asChild variant="outline" size="sm" data-advance-refunds-link>
          <Link href="/admin/advance-refunds">
            {t("refundQueueTitle")}
            {refundCount > 0 ? (
              <Badge variant="destructive" className="ms-1 rounded-full px-1.5 text-[10px]">
                {refundCount}
              </Badge>
            ) : null}
          </Link>
        </Button>
      </div>

      <div role="tablist" aria-label={t("adminQueueTitle")} className="flex flex-wrap gap-2">
        {(["pending", "sla", "all"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            role="tab"
            aria-selected={filter === value}
            variant={filter === value ? "cta" : "outline"}
            size="sm"
            onClick={() => setFilter(value)}
          >
            {value === "pending" ? t("filterPending") : value === "sla" ? t("filterSla") : t("filterAll")}
          </Button>
        ))}
      </div>

      {list.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : list.isError ? (
        <QueryError message={t("loadError")} onRetry={() => void list.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={
            filter === "sla" ? t("emptySla") : filter === "pending" ? t("emptyPending") : t("emptyAll")
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-border md:block">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">{t("order")}</th>
                  <th className="p-3">{t("buyer")}</th>
                  <th className="p-3">{t("amountDue")}</th>
                  <th className="p-3">{t("provider")}</th>
                  <th className="p-3">{t("trxIdShort")}</th>
                  <th className="p-3">{t("sender")}</th>
                  <th className="p-3">{t("submitted")}</th>
                  <th className="p-3">{t("proof")}</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-border/60 align-top">
                    <td className="p-3">
                      <div className="grid gap-1">
                        <Link
                          className="font-medium text-primary hover:underline"
                          href={`/admin/orders/${row.orderId}`}
                        >
                          {row.orderNumber}
                        </Link>
                        <PaymentBadge status={row.status} />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="grid gap-0.5">
                        <span>{row.buyer.name}</span>
                        <span className="text-xs text-muted-foreground">{row.contactPhone}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Price value={row.amountDue} locale={locale} size="sm" />
                    </td>
                    <td className="p-3">{providerLabel(row.submissions[0]?.provider ?? "")}</td>
                    <td className="p-3 font-mono text-xs">{row.submissions[0]?.trxId ?? "—"}</td>
                    <td className="p-3 font-mono text-xs">{row.submissions[0]?.senderNumber ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {row.submissions[0]
                        ? formatDateTime(row.submissions[0].createdAt, locale)
                        : "—"}
                      {row.underSla ? <SlaBadge label={t("slaBreach")} /> : null}
                    </td>
                    <td className="p-3">
                      {row.submissions[0]?.proofUrl ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setProofUrl(row.submissions[0]!.proofUrl)}
                        >
                          {t("openProof")}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("noProof")}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <RowActions
                        row={row}
                        onVerify={() => setVerifyRow(row)}
                        onReject={() => setRejectRow(row)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {rows.map((row) => (
              <div key={row.id} className="grid gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link className="font-medium text-primary" href={`/admin/orders/${row.orderId}`}>
                    {row.orderNumber}
                  </Link>
                  <PaymentBadge status={row.status} />
                </div>
                <p className="text-muted-foreground">
                  {row.buyer.name} · {row.contactPhone}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{providerLabel(row.submissions[0]?.provider ?? "")}</span>
                  <span className="font-mono">{row.submissions[0]?.trxId ?? "—"}</span>
                  <span className="font-mono">{row.submissions[0]?.senderNumber ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Price value={row.amountDue} locale={locale} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {row.submissions[0]
                      ? formatDateTime(row.submissions[0].createdAt, locale)
                      : "—"}
                  </span>
                </div>
                {row.underSla ? <SlaBadge label={t("slaBreach")} /> : null}
                {row.submissions[0]?.proofUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setProofUrl(row.submissions[0]!.proofUrl)}
                  >
                    {t("openProof")}
                  </Button>
                ) : null}
                <RowActions
                  row={row}
                  onVerify={() => setVerifyRow(row)}
                  onReject={() => setRejectRow(row)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <VerifyDialog
        row={verifyRow}
        onClose={() => setVerifyRow(null)}
        onConfirm={(amount) => {
          if (verifyRow) verify.mutate({ id: verifyRow.id, amount });
        }}
        pending={verify.isPending}
      />

      <RejectDialog
        row={rejectRow}
        onClose={() => setRejectRow(null)}
        onConfirm={(reason) => {
          if (rejectRow) reject.mutate({ id: rejectRow.id, reason });
        }}
        pending={reject.isPending}
      />

      <Dialog open={Boolean(proofUrl)} onOpenChange={(open) => !open && setProofUrl(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("proof")}</DialogTitle>
            <DialogDescription>{t("openProof")}</DialogDescription>
          </DialogHeader>
          {proofUrl ? (
            // Proof files are internal uploads served by the API host; the
            // optimizer is not configured for the isolated test API port.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proofUrl}
              alt={t("proof")}
              className="max-h-[70vh] w-full rounded-xl object-contain"
              loading="lazy"
            />
          ) : (
            <EmptyState icon={ImageOff} title={t("noProof")} />
          )}
          <DialogFooter>
            {proofUrl ? (
              <Button asChild variant="outline">
                <a href={proofUrl} target="_blank" rel="noreferrer">
                  {t("openProof")} <ExternalLink aria-hidden />
                </a>
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={() => setProofUrl(null)}>
              {tc("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SlaBadge({ label }: { label: string }) {
  return (
    <span className="mt-1 flex items-center gap-1 text-xs font-medium text-destructive">
      <ShieldAlert aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}

function RowActions({
  row,
  onVerify,
  onReject,
}: {
  row: AdminPaymentRow;
  onVerify: () => void;
  onReject: () => void;
}) {
  const t = useTranslations("payments");
  const canAct = row.status === "PENDING_VERIFICATION";
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="cta" size="sm" disabled={!canAct} onClick={onVerify}>
        {t("verify")}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={!canAct} onClick={onReject}>
        {t("reject")}
      </Button>
    </div>
  );
}

function VerifyDialog({
  row,
  onClose,
  onConfirm,
  pending,
}: {
  row: AdminPaymentRow | null;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  pending: boolean;
}) {
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [amount, setAmount] = useState("");
  const due = Number(row?.amountDue ?? 0);
  const received = Number(amount || 0);
  const mismatch = received > 0 && Math.abs(received - due) > 0.009;

  return (
    <Dialog
      open={Boolean(row)}
      onOpenChange={(open) => {
        if (!open) {
          setAmount("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("verifyTitle")}</DialogTitle>
          <DialogDescription>
            {row
              ? t("verifyBody", {
                  number: row.orderNumber,
                  amount: `${t("amountDue")} ${row.amountDue}`,
                })
              : null}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t("amountDue")}</span>
            <Price value={row?.amountDue} locale={locale} size="sm" />
          </div>
          <Label htmlFor="amountReceived">{t("amountReceived")}</Label>
          <Input
            id="amountReceived"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={row?.amountDue ?? ""}
          />
          {mismatch ? (
            <p
              className={cn(
                "rounded-xl border px-3 py-2 text-xs",
                received < due
                  ? "border-destructive/30 bg-destructive/5 text-destructive"
                  : "border-warning/40 bg-warning/10 text-warning-foreground",
              )}
            >
              {received < due ? t("mismatchUnder") : t("mismatchOver")}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            {tc("close")}
          </Button>
          <Button
            type="button"
            variant="cta"
            disabled={pending || received <= 0}
            onClick={() => {
              onConfirm(received);
              setAmount("");
            }}
          >
            {t("verifyConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  row,
  onClose,
  onConfirm,
  pending,
}: {
  row: AdminPaymentRow | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  pending: boolean;
}) {
  const t = useTranslations("payments");
  const tc = useTranslations("common");
  const [reason, setReason] = useState("");
  return (
    <AlertDialog
      open={Boolean(row)}
      onOpenChange={(open) => {
        if (!open) {
          setReason("");
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("rejectTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("rejectBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-2 text-sm">
          <Label htmlFor="rejectReason">{t("rejectReason")}</Label>
          <textarea
            id="rejectReason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending || reason.trim().length < 2}
            onClick={(event) => {
              event.preventDefault();
              onConfirm(reason.trim());
              setReason("");
            }}
          >
            {t("rejectConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
