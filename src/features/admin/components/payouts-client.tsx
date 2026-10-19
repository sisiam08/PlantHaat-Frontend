"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
import { payoutStatusVariant } from "../status";
import type { PayoutStatus } from "../types";
import { Pager } from "./pager";

const PAGE_SIZE = 20;
const FILTERS: ("ALL" | PayoutStatus)[] = ["ALL", "PENDING", "PROCESSING", "PAID", "FAILED"];
const METHODS = ["BKASH", "NAGAD", "ROCKET", "BANK"] as const;

export function PayoutsClient({
  initialStatus,
  initialPage,
}: {
  initialStatus: string;
  initialPage: number;
}) {
  const t = useTranslations("admin.payouts");
  const tStatus = useTranslations("admin.payoutStatus");
  const tMethods = useTranslations("admin.payoutMethods");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const queryClient = useQueryClient();

  const [sellerProfileId, setSellerProfileId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("BKASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [updateFor, setUpdateFor] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<PayoutStatus>("PAID");

  const status = FILTERS.includes(initialStatus as "ALL" | PayoutStatus)
    ? (initialStatus as "ALL" | PayoutStatus)
    : "ALL";
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: queryKeys.admin.payouts({ status, page }),
    queryFn: () =>
      adminApi.listPayouts({
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
    router.push(qs ? `/admin/payouts?${qs}` : "/admin/payouts");
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.payouts() });

  const create = useMutation({
    mutationFn: () =>
      adminApi.createPayout({
        sellerProfileId: sellerProfileId.trim(),
        amount: Number(amount),
        method: method as (typeof METHODS)[number],
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: async () => {
      setSellerProfileId("");
      setAmount("");
      setReference("");
      setNote("");
      await invalidate();
      toast.success(t("created"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const update = useMutation({
    mutationFn: (id: string) => adminApi.updatePayout(id, { status: updateStatus }),
    onSuccess: async () => {
      setUpdateFor(null);
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted-foreground">{t("availableOnlyNote")}</p>
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

      {query.isLoading ? <Skeleton className="h-20 w-full" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((payout) => (
          <Card key={payout.id} className="rounded-2xl">
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid gap-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{payout.payoutNumber}</span>
                    <Badge variant={payoutStatusVariant(payout.status)}>
                      {tStatus(payout.status)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {payout.sellerProfile.businessName} · {formatBdt(payout.amount, "en")} ·{" "}
                    {formatLatinDateTime(payout.createdAt)}
                  </span>
                  {payout.method ? (
                    <span className="text-xs text-muted-foreground">
                      {tMethods(payout.method)} · {payout.accountMasked ?? ""}{" "}
                      {payout.reference ? `· ${payout.reference}` : ""}
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUpdateStatus("PAID");
                    setUpdateFor(payout.id);
                  }}
                >
                  {t("update")}
                </Button>
              </div>

              {updateFor === payout.id ? (
                <div className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`status-${payout.id}`}>{t("status")}</Label>
                    <select
                      id={`status-${payout.id}`}
                      className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                      value={updateStatus}
                      onChange={(event) => setUpdateStatus(event.target.value as PayoutStatus)}
                    >
                      {(["PENDING", "PROCESSING", "PAID", "FAILED"] as PayoutStatus[]).map(
                        (value) => (
                          <option key={value} value={value}>
                            {tStatus(value)}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      variant="cta"
                      disabled={update.isPending}
                      onClick={() => update.mutate(payout.id)}
                    >
                      {tCommon("save")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setUpdateFor(null)}>
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

      <Card className="rounded-2xl">
        <CardContent>
          <h2 className="mb-4 text-lg font-semibold">{t("add")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sellerProfileId">{t("sellerProfileId")}</Label>
              <Input
                id="sellerProfileId"
                value={sellerProfileId}
                onChange={(event) => setSellerProfileId(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="payoutAmount">{t("amount")}</Label>
              <Input
                id="payoutAmount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="payoutMethod">{t("method")}</Label>
              <select
                id="payoutMethod"
                className="h-10 rounded-full border border-input bg-background px-4 text-sm"
                value={method}
                onChange={(event) => setMethod(event.target.value)}
              >
                {METHODS.map((value) => (
                  <option key={value} value={value}>
                    {tMethods(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="payoutReference">{t("reference")}</Label>
              <Input
                id="payoutReference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="payoutNote">{tCommon("note")}</Label>
              <Input
                id="payoutNote"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="button"
                variant="cta"
                disabled={
                  create.isPending || sellerProfileId.trim().length === 0 || !(Number(amount) > 0)
                }
                onClick={() => create.mutate()}
              >
                {tCommon("save")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
