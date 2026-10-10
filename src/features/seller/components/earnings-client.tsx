"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { formatBdt } from "@/lib/format/money";
import { sellerApi } from "../api";
import { payoutStatusVariant } from "../status";

export function EarningsClient() {
  const t = useTranslations("seller.earnings");
  const tLedger = useTranslations("seller.ledgerType");
  const tStatus = useTranslations("seller.payoutStatus");
  const locale = useLocale();

  const earnings = useQuery({
    queryKey: queryKeys.seller.earnings,
    queryFn: sellerApi.getEarnings,
    retry: false,
  });

  if (earnings.isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (earnings.isError || !earnings.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const { balance, ledger, payouts } = earnings.data;
  const balanceValue = Number(balance);
  const positive = Number.isFinite(balanceValue) ? balanceValue >= 0 : true;

  return (
    <div className="grid gap-5">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("balanceTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <p className="text-3xl font-bold">{formatBdt(balance, locale)}</p>
          <p className="text-sm text-muted-foreground">
            {positive ? t("owedToYou") : t("commissionDue")}
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("ledgerTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {ledger.length === 0 ? (
            <p className="text-muted-foreground">{t("noLedger")}</p>
          ) : (
            ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
              >
                <div className="grid gap-0.5">
                  <span className="font-medium">{tLedger(entry.type)}</span>
                  {entry.description ? (
                    <span className="text-xs text-muted-foreground">{entry.description}</span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {formatLatinDateTime(entry.createdAt)}
                  </span>
                </div>
                <span className="shrink-0">{formatBdt(entry.amount, locale)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("payoutsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {payouts.length === 0 ? (
            <p className="text-muted-foreground">{t("noPayouts")}</p>
          ) : (
            payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0"
              >
                <div className="grid gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{payout.payoutNumber}</span>
                    <Badge variant={payoutStatusVariant(payout.status)}>
                      {tStatus(payout.status)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {payout.method ?? "-"} · {formatLatinDateTime(payout.createdAt)}
                  </span>
                </div>
                <span className="shrink-0">{formatBdt(payout.amount, locale)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
