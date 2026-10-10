"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { formatBdt } from "@/lib/format/money";
import { adminApi } from "../api";
import { paymentStatusVariant } from "../status";

export function PaymentDetail({ id }: { id: string }) {
  const t = useTranslations("admin.payments");
  const tStatus = useTranslations("admin.paymentStatus");

  const query = useQuery({
    queryKey: queryKeys.admin.payments({ id }),
    queryFn: () => adminApi.getPayment(id),
    retry: false,
  });

  if (query.isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const payment = query.data;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{payment.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">{formatLatinDateTime(payment.createdAt)}</p>
        </div>
        <Badge variant={paymentStatusVariant(payment.status)}>{tStatus(payment.status)}</Badge>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <Row label={t("amount")} value={formatBdt(payment.amount, "en")} />
          <Row label={t("currency")} value={payment.currency} />
          <Row label={t("method")} value={payment.method} />
          <Row label={t("provider")} value={payment.provider ?? "-"} />
          <Row label={t("providerTxnId")} value={payment.providerTxnId ?? "-"} />
          <Row label={t("shopOrder")} value={payment.shopOrderNumber ?? "-"} />
          <Row label={t("paidAt")} value={payment.paidAt ? formatLatinDateTime(payment.paidAt) : "-"} />
          <Row
            label={t("failedAt")}
            value={payment.failedAt ? formatLatinDateTime(payment.failedAt) : "-"}
          />
          <Row label={t("failureReason")} value={payment.failureReason ?? "-"} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
