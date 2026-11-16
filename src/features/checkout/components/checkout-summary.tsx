"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { FixedBar } from "@/components/layout/fixed-bar";
import { ProductLine } from "@/components/product/quantity-line";
import { Price } from "@/components/product/price";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCount } from "@/lib/format/number";
import { cn } from "@/lib/utils";
import type { CartView } from "@/features/cart/types";

const SHOP_PREVIEW = 3;

export function CheckoutSummary({
  view,
  disabled,
  pending,
  onPlaceOrder,
  warning,
  note,
}: {
  view: CartView;
  disabled: boolean;
  pending: boolean;
  onPlaceOrder: () => void;
  warning?: string;
  note?: string;
}) {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const [showAll, setShowAll] = useState(false);
  const placeRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const element = placeRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const collapsed = view.shops.length > SHOP_PREVIEW && !showAll;
  const shops = collapsed ? view.shops.slice(0, SHOP_PREVIEW) : view.shops;

  return (
    <>
      <Card
        data-checkout-summary
        className={cn(
          "flex min-h-0 w-full flex-col overflow-hidden rounded-2xl [--card-spacing:0px]",
          "lg:max-h-[calc(100vh-var(--header-h)-2rem)]",
        )}
      >
        <div
          data-summary-scroll
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
        >
          <h2 data-cart-summary className="font-semibold">
            {t("summary")}
          </h2>

          <div className="mt-3 grid gap-4">
            {shops.map((shop) => (
              <div
                key={shop.shopId}
                data-summary-shop
                className="grid gap-2 border-t border-border pt-3 first:border-0 first:pt-0"
              >
                <p className="truncate font-medium" title={shop.shopName}>
                  {shop.shopName}
                </p>
                {shop.items.map((item) => (
                  <ProductLine
                    key={item.variantId}
                    name={item.productName}
                    variantName={item.variantName}
                    quantity={item.quantity}
                    unitPrice={item.unitPrice}
                    lineTotal={item.lineTotal}
                    locale={locale}
                  />
                ))}
                <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                  <span>{t("shopSubtotal")}</span>
                  <span className="shrink-0">
                    <Price value={shop.subtotal} locale={locale} size="sm" />
                  </span>
                </div>
                <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                  <span>{t("delivery")}</span>
                  <span
                    className={cn(
                      "shrink-0",
                      shop.deliverable === false && "text-warning-foreground",
                    )}
                  >
                    {shop.deliveryCharge != null ? (
                      <Price value={shop.deliveryCharge} locale={locale} size="sm" />
                    ) : shop.deliverable === false ? (
                      t("notDelivering")
                    ) : (
                      t("selectToSee")
                    )}
                  </span>
                </div>
              </div>
            ))}

            {view.shops.length > SHOP_PREVIEW ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-start px-0"
                aria-expanded={showAll}
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll
                  ? t("showFewerShops")
                  : t("showAllShops", { count: formatCount(view.shops.length, locale) })}
              </Button>
            ) : null}

            <Separator />

            <div className="grid gap-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <span>{t("itemsSubtotal")}</span>
                <span className="shrink-0">
                  <Price value={view.subtotal} locale={locale} size="sm" />
                </span>
              </div>
              <div className="flex justify-between gap-3 text-muted-foreground">
                <span>{t("delivery")}</span>
                <span className="shrink-0">
                  <Price value={view.deliveryTotal} locale={locale} size="sm" />
                </span>
              </div>
            </div>

            {warning ? (
              <p className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                {warning}
              </p>
            ) : null}
          </div>
        </div>

        <div data-summary-footer className="shrink-0 border-t border-border bg-card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium">{t("total")}</span>
            <span className="shrink-0 text-base font-bold">
              <Price value={view.grandTotal} locale={locale} />
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{note ?? t("summaryNote")}</p>
          <div className="mt-3 grid gap-2">
            <div ref={placeRef}>
              <Button
                data-place-order
                variant="cta"
                size="lg"
                className={cn("w-full", showBar && "max-lg:invisible")}
                disabled={disabled || pending}
                onClick={onPlaceOrder}
              >
                {pending ? t("submitting") : t("placeOrder")}
              </Button>
            </div>
            <Button
              data-back-to-cart
              asChild
              variant="ghost"
              size="sm"
              className={cn("w-full", showBar && "max-lg:invisible")}
            >
              <Link href="/cart">{t("backToCart")}</Link>
            </Button>
          </div>
        </div>
      </Card>

      {showBar ? (
        <FixedBar className="lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t("total")}</p>
            <Price value={view.grandTotal} locale={locale} className="font-semibold" />
          </div>
          <Button
            data-place-order-bar
            variant="cta"
            disabled={disabled || pending}
            onClick={onPlaceOrder}
          >
            {pending ? t("submitting") : t("placeOrder")}
          </Button>
        </FixedBar>
      ) : null}
    </>
  );
}
