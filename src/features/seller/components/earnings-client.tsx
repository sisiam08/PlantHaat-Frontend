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

  const { pending, available, owedToPlatform, net, ledger, payouts } = earnings.data;

  return (
    <div className="grid gap-5">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("balanceTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BalanceStat label={t("available")} value={formatBdt(available, locale)} hint={t("availableHint")} tone="primary" />
            <BalanceStat label={t("pending")} value={formatBdt(pending, locale)} hint={t("pendingHint")} />
            <BalanceStat label={t("owedToPlatform")} value={formatBdt(owedToPlatform, locale)} hint={t("owedHint")} />
            <BalanceStat label={t("net")} value={formatBdt(net, locale)} hint={t("netHint")} />
          </div>
          <p className="text-sm text-muted-foreground">{t("holdExplanation")}</p>
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
                  <span className="flex flex-wrap items-center gap-1.5 font-medium">
                    {tLedger(entry.type)}
                    {Number(entry.amount) > 0 &&
                    entry.availableAt &&
                    new Date(entry.availableAt) > new Date() ? (
                      <Badge variant="secondary" className="rounded-full text-[10px]">
                        {t("pendingBadge")}
                      </Badge>
                    ) : null}
                  </span>
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

function BalanceStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "primary";
}) {
  return (
    <div className="grid gap-1 rounded-xl border border-border/60 bg-secondary/30 p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={tone === "primary" ? "text-xl font-bold text-primary" : "text-xl font-semibold"}>
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </div>
  );
}
