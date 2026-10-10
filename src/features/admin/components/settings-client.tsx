"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { adminApi } from "../api";
import type { AdminSettings } from "../types";

const NUMBER_KEYS = [
  { key: "commission.default", label: "commissionDefault" },
  { key: "order.sellerConfirmTimeoutHours", label: "sellerConfirmTimeoutHours" },
  { key: "complaint.windowHours", label: "complaintWindowHours" },
  { key: "review.windowDays", label: "reviewWindowDays" },
  { key: "checkout.maxQtyPerItem", label: "checkoutMaxQtyPerItem" },
  { key: "shop.maxPerSeller", label: "shopMaxPerSeller" },
] as const;
const BOOLEAN_KEYS = [
  { key: "product.autoApprove", label: "productAutoApprove" },
  { key: "payments.online.enabled", label: "paymentsOnlineEnabled" },
] as const;

export function SettingsClient() {
  const t = useTranslations("admin.settings");
  const query = useQuery({
    queryKey: queryKeys.admin.settings,
    queryFn: adminApi.getSettings,
    retry: false,
  });

  if (query.isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  return <SettingsForm initial={query.data} />;
}

function SettingsForm({ initial }: { initial: AdminSettings }) {
  const t = useTranslations("admin.settings");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();

  const [numbers, setNumbers] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const { key } of NUMBER_KEYS) {
      next[key] = initial[key] === undefined ? "" : String(initial[key]);
    }
    return next;
  });
  const [booleans, setBooleans] = useState<Record<string, boolean>>(() => {
    const next: Record<string, boolean> = {};
    for (const { key } of BOOLEAN_KEYS) {
      next[key] = Boolean(initial[key]);
    }
    return next;
  });

  const save = useMutation({
    mutationFn: () => {
      const values: AdminSettings = {};
      for (const { key } of NUMBER_KEYS) {
        const raw = numbers[key];
        if (raw !== undefined && raw !== "") values[key] = Number(raw);
      }
      for (const { key } of BOOLEAN_KEYS) {
        values[key] = booleans[key] ?? false;
      }
      return adminApi.updateSettings(values);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings });
      toast.success(t("saved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  return (
    <Card className="rounded-2xl">
      <CardContent className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {NUMBER_KEYS.map(({ key, label }) => (
            <div key={key} className="grid gap-1.5">
              <Label htmlFor={key}>{t(`keys.${label}`)}</Label>
              <Input
                id={key}
                inputMode="numeric"
                value={numbers[key] ?? ""}
                onChange={(event) => setNumbers({ ...numbers, [key]: event.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="grid gap-3">
          {BOOLEAN_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={key}
                checked={booleans[key] ?? false}
                onCheckedChange={(value) => setBooleans({ ...booleans, [key]: value === true })}
              />
              <Label htmlFor={key}>{t(`keys.${label}`)}</Label>
            </div>
          ))}
        </div>
        <div>
          <Button type="button" variant="cta" disabled={save.isPending} onClick={() => save.mutate()}>
            {t("save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
