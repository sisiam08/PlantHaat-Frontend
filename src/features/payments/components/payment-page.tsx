"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Info, Loader2, MessageCircle, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import { QueryError } from "@/components/feedback/query-error";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Price } from "@/components/product/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { apiGet } from "@/lib/api/client";
import { PAYMENT_PROVIDER_LABEL, paymentsApi, type PaymentProvider } from "../api";
import { formatDateTime } from "@/lib/format/date";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHONE_RE = /^(?:\+?88)?01[3-9]\d{8}$/;
const TRX_RE = /^[A-Za-z0-9]{6,40}$/;

function providerLabel(provider: PaymentProvider): string {
  return PAYMENT_PROVIDER_LABEL[provider] ?? provider;
}

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = value;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export function PaymentPage({ orderId }: { orderId: string }) {
  const t = useTranslations("payments");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const payment = useQuery({
    queryKey: queryKeys.payment(orderId),
    queryFn: () => paymentsApi.get(orderId),
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING_VERIFICATION" ? 30_000 : false,
    retry: 1,
  });

  const publicSettings = useQuery({
    queryKey: ["settings", "public"],
    queryFn: () =>
      apiGet<Record<string, unknown>>("/settings/public").then((result) => result.data),
    staleTime: 60_000,
  });
  const whatsapp = String(publicSettings.data?.["support.whatsapp"] ?? "").replace(/\D/g, "");

  const dataless = !payment.data;
  const providerList = payment.data?.instructions.providers ?? [];
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const selectedProvider = provider ?? providerList[0]?.provider ?? null;
  const [showForm, setShowForm] = useState(false);
  const [senderNumber, setSenderNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [proofKey, setProofKey] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const status = payment.data?.status ?? "UNPAID";
  const active = status === "UNPAID" || status === "REJECTED" || status === "EXPIRED";
  const now = useNow(active);

  const expiresIn = useMemo(() => {
    if (!payment.data) return null;
    const diff = new Date(payment.data.expiresAt).getTime() - now;
    if (diff <= 0) return { expired: true, hours: 0, minutes: 0 };
    return {
      expired: false,
      hours: Math.floor(diff / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
    };
  }, [payment.data, now]);

  const number = providerList.find((entry) => entry.provider === selectedProvider)?.number ?? "";

  const submit = useMutation({
    mutationFn: () =>
      paymentsApi.submit(orderId, {
        provider: selectedProvider!,
        trxId: trxId.trim().toUpperCase(),
        senderNumber: senderNumber.replace(/\s+/g, ""),
        ...(proofKey ? { proofUrl: proofKey } : {}),
      }),
    onSuccess: async () => {
      setShowForm(false);
      setProofKey(null);
      setProofName(null);
      setTrxId("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.payment(orderId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) });
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const onCopy = async () => {
    if (!number) return;
    if (await copyText(number)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const onFile = async (file: File | undefined) => {
    setProofError(null);
    if (!file) return;
    if (file.size > MAX_PROOF_BYTES) {
      setProofError(t("proofTooLarge"));
      return;
    }
    if (!PROOF_TYPES.includes(file.type)) {
      setProofError(t("proofInvalid"));
      return;
    }
    setUploading(true);
    try {
      const result = await paymentsApi.uploadProof(file);
      setProofKey(result.key);
      setProofName(file.name);
    } catch (error) {
      toastApiError(error, tErrors);
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!selectedProvider) {
      setFormError(t("noProvider"));
      return;
    }
    if (!PHONE_RE.test(senderNumber.replace(/\s+/g, ""))) {
      setFormError(t("invalidPhone"));
      return;
    }
    if (!TRX_RE.test(trxId.trim())) {
      setFormError(t("invalidTrx"));
      return;
    }
    submit.mutate();
  };

  if (payment.isLoading) {
    return (
      <PageContainer width="form" className="gap-4">
        <PageHeader title={t("title")} />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </PageContainer>
    );
  }

  if (payment.isError || dataless) {
    return (
      <PageContainer width="form" className="gap-4">
        <PageHeader title={t("title")} />
        <QueryError message={t("loadError")} onRetry={() => void payment.refetch()} />
        <div className="text-center">
          <Button asChild variant="outline">
            <Link href="/orders">{t("backToOrders")}</Link>
          </Button>
        </div>
      </PageContainer>
    );
  }

  const info = payment.data;
  const latest = info.submissions[0];
  const statusTone =
    status === "PAID" || status === "PARTIALLY_REFUNDED" || status === "REFUNDED"
      ? "default"
      : status === "REJECTED" || status === "EXPIRED"
        ? "destructive"
        : "secondary";

  return (
    <PageContainer width="form" className="gap-4">
      <div className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <PageHeader title={t("title")} />
          <Badge variant={statusTone}>{t(`status.${status}`)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t("subtitle", { number: info.orderNumber })}</p>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="grid gap-2">
          <span className="text-sm text-muted-foreground">{t("amountDue")}</span>
          <Price value={info.amountDue} locale={locale} size="xl" className="text-primary" />
          {status === "UNPAID" && expiresIn ? (
            <span className="text-sm text-muted-foreground">
              {expiresIn.expired
                ? t("expiredAt", { time: formatDateTime(info.expiresAt, locale) })
                : t("payWithin", {
                    time: t("expiresIn", {
                      hours: String(expiresIn.hours),
                      minutes: String(expiresIn.minutes),
                    }),
                  })}
            </span>
          ) : null}
          {Number(info.paidAmount) > 0 &&
          Number(info.remainingAmount) > 0 &&
          status !== "EXPIRED" ? (
            <p className="text-sm text-destructive">
              {t("underpaidTitle")}:{" "}
              <Price value={info.remainingAmount} locale={locale} size="sm" />
            </p>
          ) : null}
        </CardContent>
      </Card>

      {status === "PENDING_VERIFICATION" ? (
        <StatusPanel
          tone="pending"
          title={t("pendingTitle")}
          body={t("pendingBody", {
            trxId: latest?.trxId ?? "",
            verificationText: info.instructions.verificationText,
          })}
          time={latest ? formatDateTime(latest.createdAt, locale) : null}
          timeLabel={t("submittedAt", { time: "" }).trim()}
        />
      ) : null}

      {status === "PAID" ? (
        <StatusPanel
          tone="paid"
          title={t("paidTitle")}
          body={t("paidBody", { time: info.paidAt ? formatDateTime(info.paidAt, locale) : "" })}
        />
      ) : null}

      {status === "REJECTED" ? (
        <StatusPanel
          tone="rejected"
          title={t("rejectedTitle")}
          body={t("rejectedReason", { reason: latest?.rejectReason ?? "" })}
          note={info.remainingAmount !== "0" ? t("underpaidTitle") : undefined}
        />
      ) : null}

      {status === "EXPIRED" ? (
        <StatusPanel
          tone="expired"
          title={t("expiredTitle")}
          body={t("expiredBody")}
          note={t("graceBody")}
        />
      ) : null}

      {status === "PARTIALLY_REFUNDED" || status === "REFUNDED" ? (
        <StatusPanel
          tone="refund"
          title={t("refundStatus", { status: t(`status.${status}`) })}
          body={t("refundAmount")}
        />
      ) : null}

      {active && selectedProvider ? (
        <Card className="rounded-2xl">
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <span className="text-sm font-medium">{t("howToSend")}</span>
              <div role="radiogroup" aria-label={t("howToSend")} className="grid grid-cols-2 gap-2">
                {providerList.map((entry) => (
                  <button
                    key={entry.provider}
                    type="button"
                    role="radio"
                    aria-checked={selectedProvider === entry.provider}
                    onClick={() => setProvider(entry.provider)}
                    className={cn(
                      "min-h-11 rounded-xl border px-3 text-sm font-medium transition-colors",
                      selectedProvider === entry.provider
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30"
                        : "border-border bg-card hover:bg-secondary/40",
                    )}
                  >
                    {providerLabel(entry.provider)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
              <p>
                <span className="font-semibold">{t("warningTitle")}: </span>
                {info.instructions.warningText}
              </p>
            </div>

            <div className="grid gap-2 rounded-xl border border-border bg-secondary/30 p-4">
              <span className="text-xs font-medium text-muted-foreground">
                {t("receivingNumber")}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  data-payment-number
                  className="select-all font-heading text-2xl font-bold tracking-wide"
                >
                  {number}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => void onCopy()}>
                  {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copied ? t("copied") : t("copyNumber")}
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">
                {providerLabel(selectedProvider)} · {info.instructions.accountNote}
              </span>
            </div>

            <ol className="grid gap-2 text-sm">
              <li className="flex gap-2">
                <StepNumber value={1} />
                <span>
                  {t("step1Prefix")}{" "}
                  <Price value={info.amountDue} locale={locale} size="sm" /> {t("step1Suffix")}
                </span>
              </li>
              <li className="flex gap-2">
                <StepNumber value={2} />
                <span>{t("step2")}</span>
              </li>
              <li className="flex gap-2">
                <StepNumber value={3} />
                <span>{t("step3")}</span>
              </li>
              <li className="flex gap-2">
                <StepNumber value={4} />
                <span>{t("step4")}</span>
              </li>
            </ol>

            {!showForm ? (
              <Button type="button" variant="cta" size="lg" onClick={() => setShowForm(true)}>
                {t("paymentMade")}
              </Button>
            ) : (
              <form onSubmit={onSubmit} className="grid gap-3" noValidate>
                <h2 className="font-heading text-lg font-semibold">{t("formTitle")}</h2>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">{t("senderNumber")}</span>
                  <input
                    value={senderNumber}
                    onChange={(event) => setSenderNumber(event.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    className="h-11 rounded-full border border-input bg-background px-4 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-describedby="sender-hint"
                  />
                  <span id="sender-hint" className="text-xs text-muted-foreground">
                    {t("senderHint")}
                  </span>
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">{t("trxId")}</span>
                  <input
                    value={trxId}
                    onChange={(event) => setTrxId(event.target.value)}
                    autoComplete="off"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    dir="ltr"
                    className="h-11 rounded-full border border-input bg-background px-4 font-mono text-sm uppercase focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  />
                  <span className="text-xs text-muted-foreground">{t("trxIdHint")}</span>
                </label>
                <div className="grid gap-1.5 text-sm">
                  <span className="font-medium">{t("proof")}</span>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => void onFile(event.target.files?.[0])}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileInput.current?.click()}
                    >
                      {uploading ? <Loader2 aria-hidden className="animate-spin" /> : null}
                      {uploading ? t("uploading") : t("proof")}
                    </Button>
                    {proofName ? (
                      <span className="text-xs text-muted-foreground">
                        {t("proofUploaded")}: {proofName}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs text-muted-foreground">{t("proofHint")}</span>
                  {proofError ? <p className="text-xs text-destructive">{proofError}</p> : null}
                </div>
                {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="cta" size="lg" disabled={submit.isPending || uploading}>
                    {submit.isPending ? <Loader2 aria-hidden className="animate-spin" /> : null}
                    {submit.isPending ? t("submitting") : t("submit")}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                    {t("hideForm")}
                  </Button>
                </div>
              </form>
            )}

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <MessageCircle aria-hidden className="size-4" />
              <span>{t("helpTitle")}</span>
              <a
                className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline"
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                {t("whatsapp")}
              </a>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={`/orders/${orderId}`}>{t("viewOrder")}</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/orders">{t("backToOrders")}</Link>
        </Button>
      </div>
    </PageContainer>
  );
}

function StepNumber({ value }: { value: number }) {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {value}
    </span>
  );
}

function StatusPanel({
  tone,
  title,
  body,
  note,
  time,
  timeLabel,
}: {
  tone: "pending" | "paid" | "rejected" | "expired" | "refund";
  title: string;
  body: string;
  note?: string;
  time?: string | null;
  timeLabel?: string;
}) {
  const Icon = tone === "paid" ? ShieldCheck : tone === "rejected" || tone === "expired" ? TriangleAlert : Info;
  const classes =
    tone === "paid"
      ? "border-primary/30 bg-primary/5 text-primary"
      : tone === "rejected" || tone === "expired"
        ? "border-destructive/30 bg-destructive/5 text-destructive"
        : "border-border bg-secondary/30";
  return (
    <div className={cn("flex gap-3 rounded-2xl border p-4", classes)}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="grid gap-1 text-sm">
        <p className="font-semibold">{title}</p>
        <p className="text-foreground/80">{body}</p>
        {note ? <p className="text-foreground/70">{note}</p> : null}
        {time ? (
          <p className="text-xs text-muted-foreground">
            {timeLabel} {time}
          </p>
        ) : null}
      </div>
    </div>
  );
}
