"use client";

import { BadgeCheck, Minus, Plus, Truck } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Price } from "@/components/product/price";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { formatRange } from "@/lib/format/number";
import type { CartShopView } from "../types";

/* ── Shop header (logo, name, verified, ships-from) ─────────────── */

export function ShopCardHeader({
  shop,
}: {
  shop: CartShopView["shop"] & { name: string; slug: string };
}) {
  const t = useTranslations("cart");
  return (
    <div className="flex items-center gap-3">
      <Avatar className="size-10 rounded-xl border border-border/60">
        <AvatarImage src={shop.logoUrl ?? undefined} alt={shop.name} />
        <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
          {shop.name.slice(0, 1)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <Link href={`/shops/${shop.slug}`} className="block truncate font-semibold hover:underline">
          {shop.name}
        </Link>
        {shop.district ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Truck aria-hidden className="size-3" />
            {t("shipsFrom", { district: shop.district })}
          </p>
        ) : null}
      </div>
      {shop.verified ? (
        <Badge variant="secondary" className="gap-1 rounded-full text-xs">
          <BadgeCheck />
          {t("verifiedSeller")}
        </Badge>
      ) : null}
    </div>
  );
}

/* ── Quantity stepper (shared with the cart line) ───────────────── */

export function QuantityStepper({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  const t = useTranslations("product");
  return (
    <div
      role="group"
      aria-label={t("quantity")}
      className="inline-flex items-center rounded-full border border-input bg-background"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="rounded-full"
        aria-label={t("decreaseQty")}
        disabled={quantity <= 1}
        onClick={() => onChange(Math.max(1, quantity - 1))}
      >
        <Minus aria-hidden />
      </Button>
      <span aria-live="polite" className="w-9 text-center text-sm font-medium tabular-nums">
        {quantity}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="rounded-full"
        aria-label={t("increaseQty")}
        onClick={() => onChange(quantity + 1)}
      >
        <Plus aria-hidden />
      </Button>
    </div>
  );
}

/* ── Delivery line for one shop (charge + estimated days) ───────── */

export function ShopDeliveryLine({
  shop,
  hint,
  unavailable = false,
  updating = false,
}: {
  shop: CartShopView;
  hint: string;
  unavailable?: boolean;
  updating?: boolean;
}) {
  const t = useTranslations("cart");
  const locale = useLocale();

  if (shop.deliveryCharge === null || shop.deliveryCharge === undefined) {
    const reason = shop.deliveryReason
      ? t(`deliveryReasons.${shop.deliveryReason}`)
      : null;
    return (
      <div className="grid gap-1 text-sm text-muted-foreground">
        <div className="flex min-h-5 items-center gap-2">
          <Truck aria-hidden className="size-4" />
          <span>{unavailable ? (reason ?? t("notDelivering")) : updating ? t("updatingDelivery") : hint}</span>
        </div>
        {unavailable && shop.deliveryReason ? (
          <p className="text-xs">{t("deliveryReasonHint")}</p>
        ) : null}
      </div>
    );
  }

  const hasDays =
    typeof shop.estimatedDaysMin === "number" &&
    typeof shop.estimatedDaysMax === "number" &&
    shop.estimatedDaysMax > 0;
  const extra = Number(shop.sellerExtraCharge ?? 0);
  return (
    <div className="grid gap-1 text-sm">
      <div className="flex min-h-5 justify-between gap-3">
        <span className="flex items-center gap-1.5">
          <Truck aria-hidden className="size-4" />
          {hasDays
            ? t("deliveryDays", {
                range: formatRange(shop.estimatedDaysMin ?? 0, shop.estimatedDaysMax ?? 0, locale),
              })
            : t("delivery")}
        </span>
        <span className="font-medium">
          {shop.freeDeliveryApplied ? (
            t("freeDelivery.applied")
          ) : (
            <Price value={shop.deliveryCharge} locale={locale} size="sm" />
          )}
        </span>
      </div>
      {shop.deliveryQuoteEstimated ? (
        <p className="text-xs text-muted-foreground">{t("deliveryEstimated")}</p>
      ) : null}
      {extra > 0 && shop.courierCharge != null ? (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-primary marker:content-none">
            {t("deliveryBreakdown")}
          </summary>
          <div className="mt-1 grid gap-1 rounded-lg bg-background/70 p-2 text-xs">
            <div className="flex justify-between gap-2">
              <span>{t("courierCharge")}</span>
              <Price value={shop.courierCharge} locale={locale} size="sm" />
            </div>
            <div className="flex justify-between gap-2">
              <span>{t("sellerExtra")}</span>
              <Price value={shop.sellerExtraCharge ?? "0"} locale={locale} size="sm" />
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}


