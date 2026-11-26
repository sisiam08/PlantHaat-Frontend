"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { QueryError } from "@/components/feedback/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toastApiError } from "@/features/auth/components/error-toast";
import { ApiError } from "@/lib/api/common";
import { queryKeys } from "@/lib/api/query-keys";
import { sellerApi } from "../api";
import type { DeliveryConditionView, DeliveryPaymentMode } from "../types";

const PAYMENT_MODES: DeliveryPaymentMode[] = ["COD_AND_ADVANCE", "COD_ONLY", "ADVANCE_ONLY"];

const conditionSchema = z.object({
  freeDeliveryEnabled: z.boolean(),
  freeDeliveryAbove: z.string(),
  estimatedDaysMin: z.string(),
  estimatedDaysMax: z.string(),
  paymentMode: z.enum(["COD_AND_ADVANCE", "COD_ONLY", "ADVANCE_ONLY"]),
  isActive: z.boolean(),
});

type ConditionValues = z.infer<typeof conditionSchema>;

function ConditionCard({
  item,
  onSaved,
}: {
  item: DeliveryConditionView;
  onSaved: () => Promise<void>;
}) {
  const t = useTranslations("seller.zones");
  const tErrors = useTranslations("errors");
  const form = useForm<ConditionValues>({
    resolver: zodResolver(conditionSchema),
    values: {
      freeDeliveryEnabled: item.freeDeliveryEnabled,
      freeDeliveryAbove: item.freeDeliveryAbove ?? "",
      estimatedDaysMin: String(item.estimatedDaysMin),
      estimatedDaysMax: String(item.estimatedDaysMax),
      paymentMode: item.paymentMode,
      isActive: item.isActive,
    },
  });
  const active = form.watch("isActive") ?? item.isActive;
  const save = useMutation({
    mutationFn: (values: ConditionValues) =>
      sellerApi.upsertDeliveryCondition(item.condition, {
        ...(values.freeDeliveryAbove.trim() !== ""
          ? { freeDeliveryAbove: Number(values.freeDeliveryAbove) }
          : {}),
        estimatedDaysMin: Number(values.estimatedDaysMin),
        estimatedDaysMax: Number(values.estimatedDaysMax),
        paymentMode: values.paymentMode,
        freeDeliveryEnabled: values.freeDeliveryEnabled,
        isActive: form.getValues("isActive") ?? item.isActive,
      }),
    onSuccess: async () => {
      await onSaved();
      toast.success(t("conditionSaved"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const label =
    item.condition === "INSIDE_DHAKA" ? t("conditionInsideDhaka") : t("conditionOutsideDhaka");
  const hint =
    item.condition === "INSIDE_DHAKA" ? t("conditionInsideHint") : t("conditionOutsideHint");

  return (
    <Card className="rounded-2xl">
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{label}</CardTitle>
          <Badge variant={item.configured ? "secondary" : "outline"}>
            {item.configured ? t("configured") : t("usingDefaults")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit(function (values) {
            save.mutate(values);
          })}
          noValidate
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 sm:col-span-2">
              <Switch
                id={`${item.condition}-free-enabled`}
                checked={form.watch("freeDeliveryEnabled") ?? false}
                onCheckedChange={(checked) =>
                  form.setValue("freeDeliveryEnabled", checked)
                }
              />
              <div className="grid gap-0.5">
                <Label htmlFor={`${item.condition}-free-enabled`}>
                  {t("freeDeliveryEnabled")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("freeDeliveryEnabledHint")}
                </p>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${item.condition}-free`}>{t("freeAbove")}</Label>
              <Input
                id={`${item.condition}-free`}
                inputMode="decimal"
                disabled={!(form.watch("freeDeliveryEnabled") ?? false)}
                {...form.register("freeDeliveryAbove")}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${item.condition}-eta-min`}>{t("etaMin")}</Label>
              <Input
                id={`${item.condition}-eta-min`}
                inputMode="numeric"
                {...form.register("estimatedDaysMin")}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${item.condition}-eta-max`}>{t("etaMax")}</Label>
              <Input
                id={`${item.condition}-eta-max`}
                inputMode="numeric"
                {...form.register("estimatedDaysMax")}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor={`${item.condition}-payment`}>{t("paymentMode")}</Label>
            <select
              id={`${item.condition}-payment`}
              className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm"
              {...form.register("paymentMode")}
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(
                    mode === "COD_AND_ADVANCE"
                      ? "paymentBoth"
                      : mode === "COD_ONLY"
                        ? "paymentCodOnly"
                        : "paymentAdvanceOnly",
                  )}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Switch
                checked={active}
                onCheckedChange={(checked) => form.setValue("isActive", checked)}
              />
              {t("activeCondition")}
            </label>
            <Button type="submit" loading={save.isPending}>
              {t("save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function DeliveryZonesClient() {
  const t = useTranslations("seller.zones");
  const queryClient = useQueryClient();
  const conditions = useQuery({
    queryKey: queryKeys.seller.deliveryConditions,
    queryFn: sellerApi.listDeliveryConditions,
    retry: false,
  });
  const shop = useQuery({
    queryKey: queryKeys.seller.shop,
    queryFn: sellerApi.getShop,
    retry: false,
  });
  const pickupIncomplete = Boolean(
    shop.data &&
      (!shop.data.pickupDistrictId ||
        ((shop.data.pickupDistrict?.name ?? shop.data.district) === "Dhaka" &&
          !shop.data.pickupThanaId)),
  );

  if (conditions.isError) {
    const missing =
      conditions.error instanceof ApiError &&
      conditions.error.code === "SELLER_APPLICATION_INCOMPLETE";
    return missing ? (
      <QueryError message={t("needsShop")} onRetry={() => void conditions.refetch()} />
    ) : (
      <QueryError message={t("loadError")} onRetry={() => void conditions.refetch()} />
    );
  }

  if (conditions.isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  const items = conditions.data ?? [];
  return (
    <div className="grid gap-4">
      {pickupIncomplete ? (
        <p className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {t("pickupIncomplete")}
        </p>
      ) : null}
      <div className="rounded-2xl border border-border/60 bg-secondary/30 px-4 py-3 text-sm">
        <p className="font-medium">{t("courierPricingTitle")}</p>
        <p className="mt-1 text-muted-foreground">{t("courierPricingBody")}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t("quoteUnavailableNote")}</p>
      </div>
      {items.map((item) => (
        <ConditionCard
          key={item.condition}
          item={item}
          onSaved={() => queryClient.invalidateQueries({ queryKey: queryKeys.seller.deliveryConditions })}
        />
      ))}
    </div>
  );
}





