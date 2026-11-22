"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownToLine, BadgeCheck, Clock3, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { AnimatedTabs } from "@/components/dashboard/animated-tabs";
import { BarChart } from "@/components/dashboard/bar-chart";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { Gauge } from "@/components/dashboard/progress";
import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import { Price } from "@/components/product/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { queryKeys } from "@/lib/api/query-keys";
import { ApiError } from "@/lib/api/common";
import { formatLatinDateTime } from "@/lib/format/date";
import { formatBdt } from "@/lib/format/money";
import { sellerWalletApi } from "../api";
import type { PayoutMethod, SellerWallet, SellerWalletTransaction } from "../types";
const PAGE_SIZE = 12;
const METHODS: PayoutMethod[] = ["BKASH", "NAGAD", "BANK"];
export function WalletClient({
  windowHours,
  initialWallet,
}: {
  windowHours?: number;
  initialWallet?: SellerWallet;
}) {
  const t = useTranslations("part4.wallet");
  const tPayouts = useTranslations("seller.payouts");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawKey, setWithdrawKey] = useState("");
  const wallet = useQuery({
    queryKey: queryKeys.seller.wallet,
    queryFn: sellerWalletApi.get,
    initialData: initialWallet,
    retry: false,
  });
  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.seller.wallet });
    await queryClient.invalidateQueries({ queryKey: ["seller", "wallet", "withdrawals"] });
    await queryClient.invalidateQueries({ queryKey: queryKeys.seller.earnings });
  };
  if (wallet.isLoading) {
    return (
      <div className="grid gap-4" aria-busy>
        {" "}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {" "}
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}{" "}
        </div>{" "}
        <Skeleton className="h-48 w-full rounded-2xl" />{" "}
      </div>
    );
  }
  if (wallet.isError || !wallet.data) {
    return <QueryError message={t("loadError")} onRetry={() => void wallet.refetch()} />;
  }
  const data = wallet.data;
  const windowLabel =
    windowHours && windowHours % 24 === 0
      ? t("windowDays", { count: windowHours / 24 })
      : windowHours
        ? t("windowHours", { count: windowHours })
        : t("windowFallback");
  return (
    <div className="grid gap-5">
      {" "}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {" "}
        <Stat
          label={t("available")}
          hint={t("availableHint")}
          icon={<Wallet aria-hidden className="size-4" />}
          value={<Price value={data.balances.available} locale={locale} size="xl" />}
          tone="primary"
          action={
            <Button
              type="button"
              variant="cta"
              size="sm"
              disabled={Number(data.balances.available) <= 0}
              onClick={() => {
                setWithdrawKey(globalThis.crypto.randomUUID());
                setWithdrawOpen(true);
              }}
            >
              {" "}
              <ArrowDownToLine aria-hidden /> {t("withdraw")}{" "}
            </Button>
          }
        />{" "}
        <Stat
          label={t("pending")}
          hint={t("pendingHint")}
          icon={<Clock3 aria-hidden className="size-4" />}
          value={<Price value={data.balances.pending} locale={locale} size="xl" />}
        />{" "}
        <Stat
          label={t("onHold")}
          hint={t("onHoldHint")}
          icon={<AlertTriangle aria-hidden className="size-4" />}
          value={<Price value={data.balances.onHold} locale={locale} size="xl" />}
        />{" "}
        <Stat
          label={t("totalWithdrawn")}
          hint={t("totalWithdrawnHint")}
          icon={<BadgeCheck aria-hidden className="size-4" />}
          value={<Price value={data.balances.totalWithdrawn} locale={locale} size="xl" />}
        />{" "}
      </div>{" "}
      {Number(data.balances.codDues) > 0 ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          {" "}
          <div className="grid gap-1">
            {" "}
            <span className="font-medium">{t("codDuesTitle")}</span>{" "}
            <span> {t("codDuesBody", { limit: String(data.settings.codDuesLimit) })} </span>{" "}
          </div>{" "}
          <span className="font-semibold">
            {" "}
            <Price value={data.balances.codDues} locale={locale} size="sm" />{" "}
          </span>{" "}
        </div>
      ) : null}{" "}
      <p className="text-sm text-muted-foreground">{t("rule", { window: windowLabel })}</p>{" "}
      <AnimatedTabs
        label={t("title")}
        defaultValue="overview"
        urlParam="wallet"
        tabs={[
          {
            value: "overview",
            label: t("tabOverview"),
            content: (
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <ChartCard
                    title={t("balanceComposition")}
                    summary={t("compositionSummary", {
                      available: formatBdt(data.balances.available, locale),
                      pending: formatBdt(data.balances.pending, locale),
                      onHold: formatBdt(data.balances.onHold, locale),
                    })}
                    labels={{
                      viewData: t("viewData"),
                      viewChart: t("viewChart"),
                      exportCsv: t("exportCsv"),
                    }}
                    table={{
                      columns: [
                        { key: "label", label: t("balanceComposition") },
                        { key: "amount", label: t("available"), align: "end" },
                      ],
                      rows: [
                        { label: t("available"), amount: data.balances.available },
                        { label: t("pending"), amount: data.balances.pending },
                        { label: t("onHold"), amount: data.balances.onHold },
                      ],
                    }}
                    csvName="wallet-composition"
                  >
                    <DonutChart
                      centerLabel={t("total")}
                      summary={t("compositionSummary", {
                        available: formatBdt(data.balances.available, locale),
                        pending: formatBdt(data.balances.pending, locale),
                        onHold: formatBdt(data.balances.onHold, locale),
                      })}
                      data={[
                        { label: t("available"), value: Number(data.balances.available) },
                        { label: t("pending"), value: Number(data.balances.pending) },
                        { label: t("onHold"), value: Number(data.balances.onHold) },
                      ]}
                      otherLabel={t("other")}
                      formatValue={(value) =>
                        new Intl.NumberFormat(locale === "bn" ? "bn-BD-u-nu-latn" : "en-BD", {
                          style: "currency",
                          currency: "BDT",
                          currencyDisplay: "narrowSymbol",
                          numberingSystem: "latn",
                          maximumFractionDigits: 2,
                        }).format(value)
                      }
                    />
                  </ChartCard>

                  <ChartCard
                    title={t("codDuesTitle")}
                    summary={t("codDuesSummary", {
                      value: formatBdt(data.balances.codDues, locale),
                      limit: formatBdt(data.settings.codDuesLimit, locale),
                    })}
                    labels={{
                      viewData: t("viewData"),
                      viewChart: t("viewChart"),
                      exportCsv: t("exportCsv"),
                    }}
                  >
                    <div className="grid gap-4">
                      <Gauge
                        label={t("codDuesTitle")}
                        value={Number(data.balances.codDues)}
                        max={Math.max(1, data.settings.codDuesLimit)}
                        valueText={`${formatBdt(data.balances.codDues, locale)} / ${formatBdt(
                          data.settings.codDuesLimit,
                          locale,
                        )}`}
                        tone={
                          Number(data.balances.codDues) >= data.settings.codDuesLimit
                            ? "offer"
                            : "primary"
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("codDuesBody", { limit: String(data.settings.codDuesLimit) })}
                      </p>
                    </div>
                  </ChartCard>
                </div>

                <ReleaseCalendar orders={data.pendingOrders} />

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>{t("pendingOrdersTitle")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.pendingOrders.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("noPendingOrders")}</p>
                    ) : (
                      <div className="grid gap-2 text-sm">
                        {data.pendingOrders.map((order) => (
                          <div
                            key={order.shopOrderId}
                            className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
                          >
                            <Link
                              href={`/seller/orders/${order.shopOrderId}`}
                              className="min-h-11 font-medium underline-offset-4 hover:underline"
                            >
                              {t("orderRef", { id: order.shopOrderId.slice(0, 8) })}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {order.releaseAt
                                ? t("releasesAt", { date: formatLatinDateTime(order.releaseAt) })
                                : t("waitingDelivery")}
                            </span>
                            <Price value={order.amount} locale={locale} size="sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <WithdrawalsList onChanged={invalidate} />
              </div>
            ),
          },
          {
            value: "transactions",
            label: t("tabTransactions"),
            content: <TransactionsList />,
          },
        ]}
      />
      <Card className="rounded-2xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <p className="font-medium">{tPayouts("title")}</p>
            <p className="text-sm text-muted-foreground">{tPayouts("maskedNote")}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/seller/payout-accounts">{tPayouts("title")}</Link>
          </Button>
        </CardContent>
      </Card>{" "}
      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        wallet={data}
        windowLabel={windowLabel}
        onDone={invalidate}
        idempotencyKey={withdrawKey}
      />
    </div>
  );
}
function Stat({
  label,
  hint,
  value,
  icon,
  tone,
  action,
}: {
  label: string;
  hint: string;
  value: ReactNode;
  icon?: ReactNode;
  tone?: "primary";
  action?: ReactNode;
}) {
  return (
    <Card className="rounded-2xl">
      {" "}
      <CardContent className="grid gap-1.5">
        {" "}
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {" "}
          {icon} {label}{" "}
        </span>{" "}
        <span className={tone === "primary" ? "text-primary" : undefined}>{value}</span>{" "}
        <span className="text-[11px] text-muted-foreground">{hint}</span>{" "}
        {action ? <div className="pt-1">{action}</div> : null}{" "}
      </CardContent>{" "}
    </Card>
  );
}
function ReleaseCalendar({ orders }: { orders: SellerWallet["pendingOrders"] }) {
  const t = useTranslations("part4.wallet");
  const locale = useLocale();
  const buckets = new Map<string, { count: number; amount: number }>();
  for (const order of orders) {
    const key = order.releaseAt ? order.releaseAt.slice(0, 10) : t("waitingDelivery");
    const entry = buckets.get(key) ?? { count: 0, amount: 0 };
    entry.count += 1;
    entry.amount += Number(order.amount) || 0;
    buckets.set(key, entry);
  }
  const rows = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, value]) => ({ bucket, ...value }));

  return (
    <ChartCard
      title={t("releaseCalendar")}
      summary={t("releaseSummary", {
        count: orders.length,
        amount: new Intl.NumberFormat(locale === "bn" ? "bn-BD-u-nu-latn" : "en-BD", {
          style: "currency",
          currency: "BDT",
          currencyDisplay: "narrowSymbol",
          numberingSystem: "latn",
          maximumFractionDigits: 2,
        }).format(rows.reduce((sum, row) => sum + row.amount, 0)),
      })}
      labels={{
        viewData: t("viewData"),
        viewChart: t("viewChart"),
        exportCsv: t("exportCsv"),
      }}
      empty={rows.length === 0 ? { message: t("noRelease") } : undefined}
      table={{
        columns: [
          { key: "bucket", label: t("releaseCalendar") },
          { key: "count", label: t("releaseCount"), align: "end" },
          { key: "amount", label: t("available"), align: "end" },
        ],
        rows: rows.map((row) => ({
          bucket: row.bucket,
          count: row.count,
          amount: new Intl.NumberFormat(locale === "bn" ? "bn-BD-u-nu-latn" : "en-BD", {
            style: "currency",
            currency: "BDT",
            currencyDisplay: "narrowSymbol",
            numberingSystem: "latn",
            maximumFractionDigits: 2,
          }).format(row.amount),
        })),
      }}
      csvName="release-calendar"
    >
      <BarChart
        summary={t("releaseSummary", {
          count: orders.length,
          amount: new Intl.NumberFormat(locale === "bn" ? "bn-BD-u-nu-latn" : "en-BD", {
            style: "currency",
            currency: "BDT",
            currencyDisplay: "narrowSymbol",
            numberingSystem: "latn",
            maximumFractionDigits: 2,
          }).format(rows.reduce((sum, row) => sum + row.amount, 0)),
        })}
        labels={rows.map((row) => row.bucket)}
        series={[
          {
            key: "amount",
            label: t("releaseCount"),
            values: rows.map((row) => row.amount),
            colorIndex: 2,
          },
        ]}
      />
    </ChartCard>
  );
}

function TransactionsList() {
  const t = useTranslations("part4.wallet");
  const tl = useTranslations("part4.legacy");
  const tLedger = useTranslations("part4.ledgerType");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const query = useQuery({
    queryKey: queryKeys.seller.walletTransactions({ page, type }),
    queryFn: () =>
      sellerWalletApi.transactions({ page, limit: PAGE_SIZE, type: type || undefined }),
    retry: false,
  });
  if (query.isLoading) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (query.isError) {
    return <QueryError message={t("transactionsError")} onRetry={() => void query.refetch()} />;
  }
  const items = query.data?.data ?? [];
  const meta = query.data?.meta;
  return (
    <Card className="rounded-2xl">
      {" "}
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        {" "}
        <CardTitle>{t("transactionsTitle")}</CardTitle>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <Label htmlFor="tx-type" className="sr-only">
            {" "}
            {t("filterType")}{" "}
          </Label>{" "}
          <select
            id="tx-type"
            className="min-h-9 rounded-full border border-input bg-background px-3 text-sm"
            value={type}
            onChange={(event) => {
              setPage(1);
              setType(event.target.value);
            }}
          >
            {" "}
            <option value="">{t("allTypes")}</option>{" "}
            {[
              "PAYMENT_RECEIVED",
              "SELLER_RELEASE",
              "WITHDRAWAL_RESERVE",
              "WITHDRAWAL_PAID",
              "WITHDRAWAL_REJECTED",
              "COD_DUES_ACCRUAL",
              "COD_DUES_PAYMENT",
              "REFUND_PAID",
              "ADJUSTMENT_CREDIT",
              "ADJUSTMENT_DEBIT",
            ].map((value) => (
              <option key={value} value={value}>
                {" "}
                {tLedger.has(value) ? tLedger(value) : value}{" "}
              </option>
            ))}{" "}
          </select>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        {items.length === 0 ? (
          <EmptyState title={t("noTransactions")} description={t("noTransactionsHint")} />
        ) : (
          <>
            {" "}
            <div className="hidden overflow-x-auto md:block">
              {" "}
              <table className="w-full text-sm">
                {" "}
                <thead className="text-left text-xs text-muted-foreground">
                  {" "}
                  <tr>
                    {" "}
                    <th className="py-2 pe-3">{t("colType")}</th>{" "}
                    <th className="py-2 pe-3">{t("colOrder")}</th>{" "}
                    <th className="py-2 pe-3">{t("colAmount")}</th>{" "}
                    <th className="py-2 pe-3">{t("colDate")}</th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  {items.map((entry) => (
                    <tr key={entry.id} className="border-t border-border/60">
                      {" "}
                      <td className="py-2 pe-3">
                        {" "}
                        <span className="block">{labelFor(entry, tLedger)}</span>{" "}
                        {entry.account === null ? (
                          <span
                            className="block text-[11px] text-muted-foreground"
                            title={tl("walletHelp")}
                          >
                            {" "}
                            {tl("walletLabel")}{" "}
                          </span>
                        ) : null}{" "}
                      </td>{" "}
                      <td className="py-2 pe-3 text-muted-foreground">
                        {" "}
                        {entry.shopOrderId ? (
                          <Link
                            href={`/seller/orders/${entry.shopOrderId}`}
                            className="underline-offset-4 hover:underline"
                          >
                            {" "}
                            {entry.shopOrderId.slice(0, 8)}{" "}
                          </Link>
                        ) : (
                          "—"
                        )}{" "}
                      </td>{" "}
                      <td className="py-2 pe-3">
                        {" "}
                        <Price value={entry.amount} locale={locale} size="sm" />{" "}
                      </td>{" "}
                      <td className="py-2 pe-3 text-xs text-muted-foreground">
                        {" "}
                        {formatLatinDateTime(entry.createdAt)}{" "}
                      </td>{" "}
                    </tr>
                  ))}{" "}
                </tbody>{" "}
              </table>{" "}
            </div>{" "}
            <div className="grid gap-2 md:hidden">
              {" "}
              {items.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-border/60 p-3 text-sm"
                >
                  {" "}
                  <div className="grid gap-0.5">
                    {" "}
                    <span className="font-medium">{labelFor(entry, tLedger)}</span>{" "}
                    {entry.account === null ? (
                      <span className="text-[11px] text-muted-foreground">{tl("walletLabel")}</span>
                    ) : null}{" "}
                    <span className="text-xs text-muted-foreground">
                      {" "}
                      {formatLatinDateTime(entry.createdAt)}{" "}
                    </span>{" "}
                  </div>{" "}
                  <Price value={entry.amount} locale={locale} size="sm" />{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </>
        )}{" "}
        {meta && meta.totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between">
            {" "}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              {" "}
              {t("previous")}{" "}
            </Button>{" "}
            <span className="text-xs text-muted-foreground">
              {" "}
              {t("pageOf", { page: meta.page, total: meta.totalPages })}{" "}
            </span>{" "}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              {" "}
              {t("next")}{" "}
            </Button>{" "}
          </div>
        ) : null}{" "}
      </CardContent>{" "}
    </Card>
  );
}
function labelFor(
  entry: SellerWalletTransaction,
  tLedger: { (key: string): string; has: (key: string) => boolean },
) {
  if (tLedger.has(entry.type)) return tLedger(entry.type);
  return entry.account ?? entry.type;
}
function WithdrawalsList({ onChanged }: { onChanged: () => Promise<void> }) {
  const t = useTranslations("part4.wallet");
  const tStatus = useTranslations("part4.withdrawalStatus");
  const locale = useLocale();
  const query = useQuery({
    queryKey: queryKeys.seller.withdrawals({}),
    queryFn: () => sellerWalletApi.listWithdrawals({ limit: 10 }),
    retry: false,
  });
  if (query.isLoading) return <Skeleton className="h-28 w-full rounded-2xl" />;
  if (query.isError) {
    return <QueryError message={t("withdrawalsError")} onRetry={() => void query.refetch()} />;
  }
  const items = query.data?.data ?? [];
  return (
    <Card className="rounded-2xl">
      {" "}
      <CardHeader>
        {" "}
        <CardTitle>{t("withdrawalsTitle")}</CardTitle>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noWithdrawals")}</p>
        ) : (
          <div className="grid gap-2 text-sm">
            {" "}
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
              >
                {" "}
                <div className="grid gap-0.5">
                  {" "}
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {" "}
                    {item.payoutNumber}{" "}
                    <Badge
                      variant={
                        item.status === "PAID"
                          ? "default"
                          : item.status === "REJECTED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {" "}
                      {tStatus(item.status)}{" "}
                    </Badge>{" "}
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    {formatLatinDateTime(item.createdAt)}{" "}
                    {item.rejectionReason ? ` — ${item.rejectionReason}` : ""}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Price value={item.amount} locale={locale} size="sm" />{" "}
                  {item.status === "PENDING" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled
                      title={t("cancelUnavailable")}
                    >
                      {" "}
                      {t("cancel")}{" "}
                    </Button>
                  ) : null}{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
        <div className="pt-2">
          {" "}
          <Button type="button" variant="ghost" size="sm" onClick={() => void onChanged()}>
            {" "}
            {t("refresh")}{" "}
          </Button>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
function WithdrawDialog({
  open,
  onOpenChange,
  wallet,
  windowLabel,
  onDone,
  idempotencyKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: SellerWallet;
  windowLabel: string;
  onDone: () => Promise<void>;
  idempotencyKey: string;
}) {
  const t = useTranslations("part4.wallet");
  const tErrors = useTranslations("errors");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PayoutMethod>(
    (wallet.payoutProfile?.method ?? wallet.settings.methods[0] ?? "BKASH") as PayoutMethod,
  );
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      sellerWalletApi.requestWithdrawal(
        { amount: Number(amount), method },
        idempotencyKey || globalThis.crypto.randomUUID(),
      ),
    onSuccess: async () => {
      toast.success(t("withdrawalRequested"));
      onOpenChange(false);
      await onDone();
    },
    onError: (cause) => {
      const code = cause instanceof ApiError ? cause.code : "generic";
      setError(tErrors.has(code) ? tErrors(code) : tErrors("generic"));
    },
  });
  const available = Number(wallet.balances.available);
  const minimum = wallet.settings.minimumAmount;
  const numeric = Number(amount);
  const amountError =
    amount.trim() === "" || !Number.isFinite(numeric)
      ? null
      : numeric < minimum
        ? tErrors("PAYOUT_BELOW_MINIMUM")
        : numeric > available
          ? tErrors("PAYOUT_EXCEEDS_AVAILABLE")
          : null;
  const invalid = !Number.isFinite(numeric) || numeric < minimum || numeric > available;
  const noProfile = !wallet.payoutProfile;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setAmount("");
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      {" "}
      <DialogContent className="sm:max-w-md">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle>{t("withdrawTitle")}</DialogTitle>{" "}
          <DialogDescription> {t("withdrawBody", { window: windowLabel })} </DialogDescription>{" "}
        </DialogHeader>{" "}
        <div className="grid gap-3">
          {" "}
          <div className="grid gap-1.5">
            {" "}
            <Label htmlFor="withdraw-amount">{t("amount")}</Label>{" "}
            <div className="flex gap-2">
              {" "}
              <Input
                id="withdraw-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                aria-describedby="withdraw-hint"
              />{" "}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(String(available))}
              >
                {" "}
                {t("all")}{" "}
              </Button>{" "}
            </div>{" "}
            <p id="withdraw-hint" className="text-xs text-muted-foreground">
              {" "}
              {t("limits", {
                min: minimum,
                available: wallet.balances.available,
                max: wallet.settings.maxPendingRequests,
              })}{" "}
            </p>{" "}
            {amountError ? <p className="text-sm text-destructive">{amountError}</p> : null}
          </div>{" "}
          <div className="grid gap-1.5">
            <Label htmlFor="withdraw-method">{t("method")}</Label>
            <select
              id="withdraw-method"
              className="min-h-11 rounded-full border border-input bg-background px-4 text-sm"
              value={method}
              onChange={(event) => setMethod(event.target.value as PayoutMethod)}
            >
              {" "}
              {wallet.settings.methods
                .filter((value) => METHODS.includes(value))
                .map((value) => (
                  <option key={value} value={value}>
                    {" "}
                    {value}{" "}
                  </option>
                ))}{" "}
            </select>{" "}
          </div>{" "}
          {noProfile ? (
            <p className="rounded-xl bg-secondary/60 px-3 py-2 text-sm"> {t("profileRequired")} </p>
          ) : null}{" "}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}{" "}
        </div>{" "}
        <DialogFooter>
          {" "}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {" "}
            {t("cancel")}{" "}
          </Button>{" "}
          <Button
            type="button"
            variant="cta"
            disabled={invalid || noProfile || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {" "}
            {mutation.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null}{" "}
            {t("requestWithdrawal")}{" "}
          </Button>{" "}
        </DialogFooter>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
