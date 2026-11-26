"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DraftValues {
  "payment.bkash.enabled"?: unknown;
  "payment.bkash.number"?: unknown;
  "payment.nagad.enabled"?: unknown;
  "payment.nagad.number"?: unknown;
  "payment.rocket.enabled"?: unknown;
  "payment.rocket.number"?: unknown;
  "payment.upay.enabled"?: unknown;
  "payment.upay.number"?: unknown;
  "payment.warningText"?: unknown;
  "payment.accountNote"?: unknown;
  "payment.verificationText"?: unknown;
  "payment.instructions"?: unknown;
}

const PHONE_RE = /^01[3-9]\d{8}$/;

export function PaymentPreview({ values }: { values: Record<string, unknown> }) {
  const t = useTranslations("payments");
  const draft = values as DraftValues;
  const providers = [
    { provider: "BKASH", label: "bKash" },
    { provider: "NAGAD", label: "Nagad" },
    { provider: "ROCKET", label: "Rocket" },
    { provider: "UPAY", label: "Upay" },
  ].map((entry) => {
    const prefix = `payment.${entry.provider.toLowerCase()}`;
    return {
      ...entry,
      number: String(draft[`${prefix}.number` as keyof DraftValues] ?? "").trim(),
      enabled: draft[`${prefix}.enabled` as keyof DraftValues] === true,
    };
  }).filter((entry) => entry.enabled && PHONE_RE.test(entry.number));
  const [selected, setSelected] = useState<string>(providers[0]?.provider ?? "");
  const active = providers.find((entry) => entry.provider === selected) ?? providers[0];
  const warning = String(draft["payment.warningText"] ?? "").trim();
  const accountNote = String(draft["payment.accountNote"] ?? "").trim();
  const instructions = String(draft["payment.instructions"] ?? "").trim();

  return (
    <Card className="rounded-2xl border-dashed">
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-sm font-semibold">{t("previewTitle")}</h3>
          <Badge variant="secondary">{t("previewNote")}</Badge>
        </div>
        {providers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noProvider")}</p>
        ) : (
          <div className="grid gap-3 rounded-xl border border-border bg-secondary/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {providers.map((entry) => (
                <button
                  key={entry.provider}
                  type="button"
                  onClick={() => setSelected(entry.provider)}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 text-sm font-medium",
                    active?.provider === entry.provider
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card",
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>
            {warning ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <span className="font-semibold">{t("warningTitle")}: </span>
                {warning}
              </p>
            ) : null}
            <div className="grid gap-1 rounded-lg border border-border bg-card p-3">
              <span className="text-xs text-muted-foreground">{t("receivingNumber")}</span>
              <span className="select-all font-heading text-xl font-bold tracking-wide">
                {active?.number}
              </span>
              <span className="text-xs text-muted-foreground">
                {active?.label}
                {accountNote ? ` · ${accountNote}` : ""}
              </span>
            </div>
            {instructions ? <p className="text-xs text-muted-foreground">{instructions}</p> : null}
            <ol className="grid gap-1 text-xs text-muted-foreground">
              <li>1. {t("previewStep2")}</li>
              <li>2. {t("previewStep3")}</li>
              <li>3. {t("previewStep4")}</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              {String(draft["payment.verificationText"] ?? "")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
