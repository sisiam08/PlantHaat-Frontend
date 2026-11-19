"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import { Price } from "@/components/product/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordInput } from "@/components/ui/password-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { ApiError } from "@/lib/api/common";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminSettlementApi, adminWithdrawalDestinationApi } from "../api";
import { adminApi } from "../api";
import type { AdminWithdrawalDestination, AdminWithdrawalView } from "../types";
import { Pager } from "./pager";

const PAGE_SIZE = 20;
const FILTERS = ["ALL", "PENDING", "PAID", "REJECTED"] as const;

export function WithdrawalsClient({
  initialStatus,
  initialPage,
}: {
  initialStatus: string;
  initialPage: number;
}) {
  const t = useTranslations("part4.adminWithdrawals");
  const tErrors = useTranslations("errors");
  const tMethods = useTranslations("part4.payoutMethods");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [payFor, setPayFor] = useState<AdminWithdrawalView | null>(null);
  const [rejectFor, setRejectFor] = useState<AdminWithdrawalView | null>(null);
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [destinationFor, setDestinationFor] = useState<AdminWithdrawalView | null>(null);
  const [destinationPassword, setDestinationPassword] = useState("");
  const [destination, setDestination] = useState<AdminWithdrawalDestination | null>(null);
  const [destinationError, setDestinationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!destination) return;
    const timer = window.setTimeout(() => {
      setDestination(null);
      setDestinationFor(null);
    }, 60_000);
    return () => window.clearTimeout(timer);
  }, [destination]);

  const status = (FILTERS as readonly string[]).includes(initialStatus)
    ? initialStatus
    : "ALL";
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: queryKeys.admin.withdrawals({ status, page }),
    queryFn: () =>
      adminSettlementApi.listWithdrawals({
        status: status === "ALL" ? undefined : status,
        page,
        limit: PAGE_SIZE,
      }),
    retry: false,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.payouts() });
  };

  const reveal = useMutation({
    mutationFn: async () => {
      if (!destinationFor) throw new Error("No withdrawal selected");
      const scope = `withdrawal.destination:${destinationFor.id}`;
      const reauth = await adminApi.reauthenticateSettings([scope], destinationPassword);
      return adminWithdrawalDestinationApi.reveal(destinationFor.id, reauth.token);
    },
    onSuccess: (data) => {
      setDestination(data);
      setDestinationPassword("");
      setDestinationError(null);
      setCopied(false);
    },
    onError: (error) => {
      setDestinationError(
        error instanceof ApiError && tErrors.has(error.code) ? tErrors(error.code) : tErrors("generic"),
      );
    },
  });

  const pay = useMutation({
    mutationFn: () => adminSettlementApi.payWithdrawal(payFor!.id, reference.trim()),
    onSuccess: async () => {
      setPayFor(null);
      setReference("");
      await invalidate();
      toast.success(t("paid"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const reject = useMutation({
    mutationFn: () => adminSettlementApi.rejectWithdrawal(rejectFor!.id, reason.trim()),
    onSuccess: async () => {
      setRejectFor(null);
      setReason("");
      await invalidate();
      toast.success(t("rejected"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const go = (nextStatus: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/admin/withdrawals?${qs}` : "/admin/withdrawals");
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
            {filter === "ALL" ? t("all") : t(`status.${filter}`)}
          </Button>
        ))}
      </div>

      {query.isLoading ? <Skeleton className="h-28 w-full rounded-2xl" /> : null}
      {query.isError ? (
        <QueryError message={t("loadError")} onRetry={() => void query.refetch()} />
      ) : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <EmptyState title={t("empty")} description={t("emptyHint")} />
      ) : null}

      <div className="grid gap-3">
        {items.map((item) => (
          <Card key={item.id} className="rounded-2xl">
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.payoutNumber}</span>
                    <Badge
                      variant={
                        item.status === "PAID"
                          ? "default"
                          : item.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {t(`status.${item.status}`)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {item.seller?.businessName ?? item.sellerProfileId.slice(0, 8)} ·{" "}
                    {formatLatinDateTime(item.createdAt)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.method ? tMethods(item.method) : "—"} · {item.accountMasked ?? "—"}
                  </span>
                  {item.balanceSnapshot ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {t("snapshot")}:
                      <Price value={item.balanceSnapshot} locale={locale} size="sm" />
                    </span>
                  ) : null}
                  {item.reference ? (
                    <span className="text-xs text-muted-foreground">
                      {t("reference")}: {item.reference}
                    </span>
                  ) : null}
                  {item.rejectionReason ? (
                    <span className="text-xs text-destructive">{item.rejectionReason}</span>
                  ) : null}
                </div>
                <span className="text-lg font-semibold">
                  <Price value={item.amount} locale={locale} size="md" />
                </span>
              </div>

              {item.status === "PENDING" || item.status === "PROCESSING" ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="cta"
                    size="sm"
                    onClick={() => {
                      setReference("");
                      setPayFor(item);
                    }}
                  >
                    {t("markPaid")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReason("");
                      setRejectFor(item);
                    }}
                  >
                    {t("reject")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDestinationFor(item);
                      setDestination(null);
                      setDestinationPassword("");
                      setDestinationError(null);
                    }}
                  >
                    {t("showDetails")}
                  </Button>
                </div>
              ) : null}

              {payFor?.id === item.id ? (
                <div className="grid gap-2 rounded-xl border border-border p-3">
                  <Label htmlFor={`ref-${item.id}`}>{t("transactionReference")}</Label>
                  <Input
                    id={`ref-${item.id}`}
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="BKASH-..."
                  />
                  <p className="text-xs text-muted-foreground">{t("payWarning")}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="cta"
                      size="sm"
                      disabled={reference.trim().length < 2 || pay.isPending}
                      onClick={() => pay.mutate()}
                    >
                      {t("confirmPaid")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPayFor(null)}>
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {rejectFor?.id === item.id ? (
                <div className="grid gap-2 rounded-xl border border-border p-3">
                  <Label htmlFor={`reason-${item.id}`}>{t("rejectReason")}</Label>
                  <Input
                    id={`reason-${item.id}`}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{t("rejectWarning")}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={reason.trim().length < 3 || reject.isPending}
                      onClick={() => reject.mutate()}
                    >
                      {t("confirmReject")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRejectFor(null)}
                    >
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {meta ? (
        <Pager page={meta.page} totalPages={meta.totalPages} onPage={(next) => go(status, next)} />
      ) : null}

      <Dialog
        open={destinationFor !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDestinationFor(null);
            setDestination(null);
            setDestinationPassword("");
            setDestinationError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {destination ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("destinationTitle")}</DialogTitle>
                <DialogDescription>{t("destinationBody")}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
                <span className="text-xs text-muted-foreground">{t("accountHolder")}</span>
                <span className="font-medium">{destination.accountName}</span>
                <span className="text-xs text-muted-foreground">{t("accountNumber")}</span>
                <span className="flex flex-wrap items-center gap-2 font-mono text-base break-all">
                  {destination.accountNumber}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(destination.accountNumber);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? t("copied") : t("copy")}
                  </Button>
                </span>
                <span className="text-xs text-muted-foreground">{t("hideAfter")}</span>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDestination(null);
                    setDestinationFor(null);
                  }}
                >
                  {t("hide")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("reauthTitle")}</DialogTitle>
                <DialogDescription>{t("reauthBody")}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-1.5">
                <Label htmlFor="destination-password">{t("password")}</Label>
                <PasswordInput
                  id="destination-password"
                  value={destinationPassword}
                  onChange={(event) => setDestinationPassword(event.target.value)}
                  autoComplete="current-password"
                />
                {destinationError ? (
                  <p className="text-sm text-destructive">{destinationError}</p>
                ) : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDestinationFor(null)}>
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  variant="cta"
                  disabled={destinationPassword.length < 1 || reveal.isPending}
                  onClick={() => reveal.mutate()}
                >
                  {t("showDestination")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
