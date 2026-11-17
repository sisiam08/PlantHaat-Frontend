"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { FixedBar } from "@/components/layout/fixed-bar";
import { Price } from "@/components/product/price";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatCount } from "@/lib/format/number";
import type { CartView } from "../types";

function Rows({
  view,
  hasDistrict,
  updating,
}: {
  view: CartView;
  hasDistrict: boolean;
  updating: boolean;
}) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const showShipmentNote = view.shops.length > 1;

  return (
    <div className="grid gap-2.5">
      <div data-cart-subtotal className="flex justify-between gap-3 text-sm">
        <span>{t("itemsSubtotal")}</span>
        <span className="shrink-0">
          <Price value={view.subtotal} locale={locale} size="sm" />
        </span>
      </div>
      {view.shops.length > 0 ? (
        <div className="mt-1 text-sm font-medium">{t("delivery")}</div>
      ) : null}
      <div className="grid gap-1.5">
        {view.shops.map((shop) => (
          <div
            key={shop.shopId}
            className="flex justify-between gap-3 text-sm text-muted-foreground"
          >
            <span className="min-w-0 truncate pr-2" title={shop.shopName}>
              {shop.shopName}
            </span>
            <span
              className={
                shop.deliverable === false ? "shrink-0 text-warning-foreground" : "shrink-0"
              }
            >
              {shop.deliverable === false ? (
                t("notDeliveringShort")
              ) : shop.deliveryCharge != null ? (
                <Price value={shop.deliveryCharge} locale={locale} size="sm" />
              ) : hasDistrict && updating ? (
                t("updatingDelivery")
              ) : (
                t("selectDistrictShort")
              )}
            </span>
          </div>
        ))}
      </div>
      <Separator className="my-3" />
      <div className="flex justify-between gap-3 text-sm text-muted-foreground">
        <span>{t("deliveryTotal")}</span>
        <span className="shrink-0">
          <Price value={view.deliveryTotal} locale={locale} size="sm" />
        </span>
      </div>
      <div
        data-cart-grand
        className="mt-4 flex justify-between gap-3 border-t border-border pt-4 text-base font-bold"
      >
        <span>{t("grandTotal")}</span>
        <span className="shrink-0">
          <Price value={view.grandTotal} locale={locale} />
        </span>
      </div>
      {showShipmentNote ? (
        <p className="mt-4 rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
          {t("separateShipments", { count: formatCount(view.shops.length, locale) })}
        </p>
      ) : null}
    </div>
  );
}

export function CartSummaryBox({
  view,
  actions,
  showMobileBar = false,
  hasDistrict = true,
  updating = false,
  deliveryError = false,
}: {
  view: CartView;
  actions?: ReactNode;
  showMobileBar?: boolean;
  hasDistrict?: boolean;
  updating?: boolean;
  deliveryError?: boolean;
}) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const cardRef = useRef<HTMLDivElement>(null);
  const [barVisible, setBarVisible] = useState(true);

  useEffect(() => {
    const element = cardRef.current;
    if (!element || !showMobileBar) return;
    const observer = new IntersectionObserver(([entry]) => setBarVisible(!entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [showMobileBar]);

  return (
    <>
      <Card
        ref={cardRef}
        className="grid h-fit w-full self-start rounded-xl border border-border/60 py-0 shadow-[var(--shadow-soft)] lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:max-h-[calc(100vh-var(--header-h)-2rem)] lg:overflow-y-auto"
      >
        <CardContent className="grid gap-4 p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 data-cart-summary className="font-semibold">
              {t("summary")}
            </h2>
            {updating && !deliveryError ? (
              <span className="text-xs text-muted-foreground">{t("updatingDelivery")}</span>
            ) : null}
          </div>
          <Rows view={view} hasDistrict={hasDistrict} updating={updating} />
          {actions ? <div className="pt-1">{actions}</div> : null}
        </CardContent>
      </Card>

      {showMobileBar && barVisible ? (
        <FixedBar className="lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{formatCount(view.itemCount, locale)}</p>
            <Price value={view.grandTotal} locale={locale} className="font-semibold" />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                {t("summaryDetails")}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>{t("summary")}</SheetTitle>
              </SheetHeader>
              <div className="grid gap-4 p-5">
                <Rows view={view} hasDistrict={hasDistrict} updating={updating} />
              </div>
            </SheetContent>
          </Sheet>
          {actions}
        </FixedBar>
      ) : null}
    </>
  );
}
