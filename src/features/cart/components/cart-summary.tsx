"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FixedBar } from "@/components/layout/fixed-bar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { formatBdt } from "@/lib/format/money";
import { Price } from "@/components/product/price";
import { formatCount } from "@/lib/format/number";
import type { CartView } from "../types";

function Rows({ view }: { view: CartView }) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const showShipmentNote = view.shops.length > 1;

  return (
    <div className="grid gap-2">
      <div className="flex justify-between text-sm">
        <span>{t("itemsSubtotal")}</span>
        <Price value={view.subtotal} locale={locale} size="sm" />
      </div>
      {view.shops.length > 0 ? <div className="text-sm font-medium">{t("delivery")}</div> : null}
      {view.shops.map((shop) => (
        <div key={shop.shopId} className="flex justify-between text-sm text-muted-foreground">
          <span className="truncate pr-2">{shop.shopName}</span>
          <span className={shop.deliverable === false ? "text-warning-foreground" : undefined}>
            {shop.deliverable === false
              ? t("notDeliveringShort")
              : shop.deliveryCharge != null
                ? formatBdt(shop.deliveryCharge, locale)
                : t("selectDistrictShort")}
          </span>
        </div>
      ))}
      <Separator />
      <div className="flex justify-between text-sm">
        <span>{t("deliveryTotal")}</span>
        <Price value={view.deliveryTotal} locale={locale} size="sm" />
      </div>
      <div className="flex justify-between font-semibold">
        <span>{t("grandTotal")}</span>
        <Price value={view.grandTotal} locale={locale} />
      </div>
      {showShipmentNote ? (
        <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-secondary-foreground">
          {t("separateShipments", { count: view.shops.length })}
        </p>
      ) : null}
    </div>
  );
}

/**
 * One order summary box: sticky card on desktop, a fixed bottom bar with a
 * bottom-sheet breakdown on mobile (qty/charges come from the API only).
 */
export function CartSummaryBox({
  view,
  actions,
  fixedOnMobile = true,
}: {
  view: CartView;
  actions?: ReactNode;
  fixedOnMobile?: boolean;
}) {
  const t = useTranslations("cart");
  const locale = useLocale();

  return (
    <>
      {/* Desktop sticky card (always visible when there is no mobile bar) */}
      <Card
        className={
          fixedOnMobile
            ? "hidden rounded-2xl border border-border/60 shadow-sm lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:grid"
            : "grid rounded-2xl border border-border/60 shadow-sm lg:sticky lg:top-[calc(var(--header-h)+1rem)]"
        }
      >
        <CardContent className="grid gap-3">
          <h2 className="font-semibold">{t("summary")}</h2>
          <Rows view={view} />
          {actions}
        </CardContent>
      </Card>

      {/* Mobile fixed bar + bottom sheet */}
      {fixedOnMobile ? (
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
              <div className="grid gap-3 px-4 pb-6">
                <Rows view={view} />
              </div>
            </SheetContent>
          </Sheet>
          {actions}
        </FixedBar>
      ) : null}
    </>
  );
}


