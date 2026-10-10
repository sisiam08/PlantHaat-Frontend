"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { formatBdt } from "@/lib/format/money";
import { adminApi } from "../api";
import { paymentStatusVariant } from "../status";
import { Pager } from "./pager";

const PAGE_SIZE = 20;
const STATUSES = ["ALL", "PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"];
const METHODS = ["ALL", "COD", "PIPRAPAY", "BKASH", "NAGAD", "CARD", "BANK_TRANSFER"];

export function PaymentsList({
  initialStatus,
  initialMethod,
  initialOrder,
  initialPage,
}: {
  initialStatus: string;
  initialMethod: string;
  initialOrder: string;
  initialPage: number;
}) {
  const t = useTranslations("admin.payments");
  const tStatus = useTranslations("admin.paymentStatus");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const page = Math.max(1, initialPage);
  const status = STATUSES.includes(initialStatus) ? initialStatus : "ALL";
  const method = METHODS.includes(initialMethod) ? initialMethod : "ALL";
  const order = initialOrder;

  const query = useQuery({
    queryKey: queryKeys.admin.payments({ status, method, order, page }),
    queryFn: () =>
      adminApi.listPayments({
        status: status === "ALL" ? undefined : status,
        method: method === "ALL" ? undefined : method,
        order: order || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    retry: false,
  });

  const go = (next: { status?: string; method?: string; order?: string; page?: number }) => {
    const params = new URLSearchParams();
    const s = next.status ?? status;
    const m = next.method ?? method;
    const o = next.order ?? order;
    const p = next.page ?? 1;
    if (s !== "ALL") params.set("status", s);
    if (m !== "ALL") params.set("method", m);
    if (o) params.set("order", o);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    router.push(qs ? `/admin/payments?${qs}` : "/admin/payments");
  };

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1">
        {STATUSES.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={status === value ? "secondary" : "ghost"}
            onClick={() => go({ status: value, page: 1 })}
          >
            {value === "ALL" ? tCommon("allStatuses") : tStatus(value)}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="payMethod">{t("filterMethod")}</Label>
          <select
            id="payMethod"
            className="h-10 rounded-full border border-input bg-background px-4 text-sm"
            value={method}
            onChange={(event) => go({ method: event.target.value, page: 1 })}
          >
            {METHODS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="payOrder">{t("filterOrder")}</Label>
          <Input
            id="payOrder"
            defaultValue={order}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                go({ order: (event.target as HTMLInputElement).value, page: 1 });
              }
            }}
          />
        </div>
      </div>

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((payment) => (
          <Card key={payment.id} className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/payments/${payment.id}`} className="font-medium hover:underline">
                    {payment.orderNumber}
                  </Link>
                  <Badge variant={paymentStatusVariant(payment.status)}>
                    {tStatus(payment.status)}
                  </Badge>
                  <Badge variant="outline">{payment.method}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatBdt(payment.amount, "en")}
                  {payment.shopOrderNumber ? ` · ${payment.shopOrderNumber}` : ""} ·{" "}
                  {formatLatinDateTime(payment.createdAt)}
                </span>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/payments/${payment.id}`}>{t("view")}</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {meta ? (
        <Pager page={meta.page} totalPages={meta.totalPages} onPage={(p) => go({ page: p })} />
      ) : null}
    </div>
  );
}
