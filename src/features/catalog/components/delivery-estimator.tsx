"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Info, PackageCheck, Truck, X } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useId, useSyncExternalStore } from "react";

import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiGet } from "@/lib/api/client";
import type { District } from "@/lib/api/types";
import { formatBdt } from "@/lib/format/money";

const DISTRICT_KEY = "ph_delivery_district";
const DISTRICT_EVENT = "ph-delivery-district";

interface DeliveryQuote {
  deliverable: boolean;
  charge: string | null;
  freeDeliveryAbove: string | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  zoneName: string | null;
  codAvailable: boolean;
}

function subscribeStorage(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(DISTRICT_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DISTRICT_EVENT, onChange);
  };
}

export function DeliveryEstimator({
  shopSlug,
  districts,
}: {
  shopSlug: string;
  districts: District[];
}) {
  const t = useTranslations("product");
  const locale = useLocale();
  const selectId = useId();
  const districtId = useSyncExternalStore(
    subscribeStorage,
    () => window.localStorage.getItem(DISTRICT_KEY) ?? "",
    () => "",
  );

  const quote = useQuery({
    queryKey: ["catalog", "delivery-quote", shopSlug, districtId],
    queryFn: () =>
      apiGet<DeliveryQuote>(`/shops/${encodeURIComponent(shopSlug)}/delivery-quote`, {
        params: { districtId: Number(districtId) },
      }).then((result) => result.data),
    enabled: districtId !== "",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const setDistrict = (value: string) => {
    window.localStorage.setItem(DISTRICT_KEY, value);
    window.dispatchEvent(new Event(DISTRICT_EVENT));
  };

  return (
    <div className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Truck aria-hidden className="size-5 text-primary" />
        <p className="font-medium">{t("deliveryToYou")}</p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={selectId}>{t("selectDistrict")}</Label>
        <select
          id={selectId}
          value={districtId}
          onChange={(event) => setDistrict(event.target.value)}
          className="h-10 w-full rounded-full border border-input bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        >
          <option value="">{t("selectDistrict")}</option>
          {districts.map((district) => (
            <option key={district.id} value={String(district.id)}>
              {locale === "bn" ? district.nameBn : district.name}
            </option>
          ))}
        </select>
      </div>

      {districtId === "" ? null : quote.isLoading ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : quote.isError ? (
        <p className="text-sm text-muted-foreground">{t("deliveryUnavailable")}</p>
      ) : quote.data?.deliverable ? (
        <div className="grid gap-2 rounded-xl bg-secondary/40 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{t("deliveryCharge")}</span>
            <span className="font-medium">{formatBdt(quote.data.charge, locale)}</span>
          </div>
          {quote.data.estimatedDaysMin !== null && quote.data.estimatedDaysMax !== null ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{t("estimatedDays")}</span>
              <span className="font-medium">
                {t("estimatedDaysValue", {
                  min: quote.data.estimatedDaysMin,
                  max: quote.data.estimatedDaysMax,
                })}
              </span>
            </div>
          ) : null}
          {quote.data.freeDeliveryAbove ? (
            <p className="inline-flex items-center gap-1.5 text-xs text-success">
              <Check aria-hidden className="size-3.5" />
              {t("freeDeliveryAbove", {
                amount: formatBdt(quote.data.freeDeliveryAbove, locale),
              })}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          <X aria-hidden className="size-4" />
          {t("notDeliverable")}
        </p>
      )}

      <ul className="grid gap-1.5 text-xs text-muted-foreground">
        <li className="inline-flex items-center gap-1.5">
          <Check aria-hidden className="size-3.5 text-success" />
          {t("codAvailable")}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <PackageCheck aria-hidden className="size-3.5 text-primary" />
          {t("plantSafePackaging")}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <Info aria-hidden className="size-3.5 text-primary" />
          {t("deliveredBySeller")} ·{" "}
          <Link href="/policies/delivery" className="font-medium text-primary hover:underline">
            {t("deliveryPolicy")}
          </Link>
        </li>
      </ul>
    </div>
  );
}
