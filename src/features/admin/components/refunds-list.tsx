"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { formatBdt } from "@/lib/format/money";
import { adminApi } from "../api";
import { refundStatusVariant } from "../status";
import type { RefundStatus } from "../types";
import { Pager } from "./pager";

const PAGE_SIZE = 20;
const FILTERS: ("ALL" | RefundStatus)[] = ["ALL", "REQUESTED", "APPROVED", "REJECTED", "PROCESSED"];
const METHODS = ["COD", "PIPRAPAY", "BKASH", "NAGAD", "CARD", "BANK_TRANSFER"] as const;

export function RefundsList({
  initialStatus,
  initialPage,
}: {
  initialStatus: string;
  initialPage: number;
}) {
  const t = useTranslations("admin.refunds");
  const tStatus = useTranslations("admin.refundStatus");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [processFor, setProcessFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<string>("COD");
  const [reference, setReference] = useState("");

  const status = FILTERS.includes(initialStatus as "ALL" | RefundStatus)
    ? (initialStatus as "ALL" | RefundStatus)
    : "ALL";
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: queryKeys.admin.refunds({ status, page }),
    queryFn: () =>
      adminApi.listRefunds({
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
    router.push(qs ? `/admin/refunds?${qs}` : "/admin/refunds");
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.refunds() });

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveRefund(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const reject = useMutation({
    mutationFn: (id: string) => adminApi.rejectRefund(id, note.trim() || undefined),
    onSuccess: async () => {
      setRejectFor(null);
      setNote("");
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const process = useMutation({
    mutationFn: (id: string) =>
      adminApi.processRefund(id, {
        method,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: async () => {
      setProcessFor(null);
      setNote("");
      setReference("");
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

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
        {items.map((refund) => (
          <Card key={refund.id} className="rounded-2xl">
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{formatBdt(refund.amount, locale)}</span>
                    <Badge variant={refundStatusVariant(refund.status)}>
                      {tStatus(refund.status)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {refund.shopOrder.shopOrderNumber} · {formatLatinDateTime(refund.createdAt)}
                  </span>
                  <span className="text-xs text-muted-foreground">{refund.reason}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {refund.status === "REQUESTED" ? (
                    <>
                      <Button
                        type="button"
                        variant="cta"
                        size="sm"
                        disabled={approve.isPending}
                        onClick={() => approve.mutate(refund.id)}
                      >
                        {t("approve")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNote("");
                          setRejectFor(refund.id);
                        }}
                      >
                        {t("reject")}
                      </Button>
                    </>
                  ) : null}
                  {refund.status === "APPROVED" ? (
                    <Button
                      type="button"
                      variant="cta"
                      size="sm"
                      onClick={() => {
                        setNote("");
                        setReference("");
                        setMethod("COD");
                        setProcessFor(refund.id);
                      }}
                    >
                      {t("process")}
                    </Button>
                  ) : null}
                </div>
              </div>

              {rejectFor === refund.id ? (
                <div className="grid gap-2 rounded-xl border border-border p-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`reject-${refund.id}`}>{tCommon("note")}</Label>
                    <Input
                      id={`reject-${refund.id}`}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="cta"
                      disabled={reject.isPending}
                      onClick={() => reject.mutate(refund.id)}
                    >
                      {t("confirmReject")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setRejectFor(null)}>
                      {tCommon("cancel")}
                    </Button>
                  </div>
                </div>
              ) : null}

              {processFor === refund.id ? (
                <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`method-${refund.id}`}>{t("method")}</Label>
                    <select
                      id={`method-${refund.id}`}
                      className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                      value={method}
                      onChange={(event) => setMethod(event.target.value)}
                    >
                      {METHODS.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`reference-${refund.id}`}>{t("reference")}</Label>
                    <Input
                      id={`reference-${refund.id}`}
                      value={reference}
                      onChange={(event) => setReference(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor={`process-${refund.id}`}>{tCommon("note")}</Label>
                    <Input
                      id={`process-${refund.id}`}
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button
                      type="button"
                      variant="cta"
                      disabled={process.isPending}
                      onClick={() => process.mutate(refund.id)}
                    >
                      {t("confirmProcess")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setProcessFor(null)}>
                      {tCommon("cancel")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      {meta ? <Pager page={meta.page} totalPages={meta.totalPages} onPage={(p) => go(status, p)} /> : null}
    </div>
  );
}
