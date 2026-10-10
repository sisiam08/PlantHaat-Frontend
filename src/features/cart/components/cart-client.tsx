"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { apiGet } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { District } from "@/lib/api/types";
import { formatBdt } from "@/lib/format/money";
import { cartApi } from "../api";
import { removeGuestLine, setGuestQuantity } from "../guest-cart";
import type { CartItemView, CartShopView, CartView } from "../types";
import { useGuestCart } from "../use-guest-cart";

export function CartClient() {
  const { user } = useAuth();
  const t = useTranslations("cart");
  const locale = useLocale();
  const guestLines = useGuestCart();

  if (!user) {
    return (
      <div className="grid gap-4">
        <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
          {t("guestNote")}
        </p>
        {guestLines.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid gap-4">
            {guestLines.map((line) => (
              <Card key={line.variantId} className="rounded-2xl">
                <CardContent className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{line.snapshot.productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {line.snapshot.variantName} · {line.snapshot.priceDisplay}
                    </p>
                  </div>
                  <QuantityStepper
                    quantity={line.quantity}
                    onChange={(next) => setGuestQuantity(line.variantId, next)}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("remove")}
                    onClick={() => removeGuestLine(line.variantId)}
                  >
                    <Trash2 />
                  </Button>
                </CardContent>
              </Card>
            ))}
            <Button asChild variant="cta" size="lg">
              <Link href="/login?returnTo=/checkout">{t("loginToCheckout")}</Link>
            </Button>
          </div>
        )}
        <span className="sr-only">{locale}</span>
      </div>
    );
  }

  return <ServerCart />;
}

function ServerCart() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [districtId, setDistrictId] = useState<number | "">("");

  const cartKey = [...queryKeys.cart, districtId === "" ? 0 : districtId];
  const cart = useQuery({
    queryKey: cartKey,
    queryFn: () => cartApi.get(districtId === "" ? undefined : districtId),
  });
  const districts = useQuery({
    queryKey: queryKeys.catalog.districts,
    queryFn: () => apiGet<District[]>("/locations/districts").then((result) => result.data),
  });

  const update = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number }) =>
      quantity <= 0 ? cartApi.removeItem(variantId) : cartApi.putItem(variantId, quantity),
    onSuccess: (data: CartView) => queryClient.setQueryData(cartKey, data),
  });
  const remove = useMutation({
    mutationFn: (variantId: string) => cartApi.removeItem(variantId),
    onSuccess: (data: CartView) => queryClient.setQueryData(cartKey, data),
  });

  if (cart.isLoading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }
  if (cart.isError || !cart.data || cart.data.shops.length === 0) {
    return <EmptyCart />;
  }

  const view = cart.data;
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5 sm:max-w-xs">
        <Label htmlFor="cart-district">{t("deliveryDistrict")}</Label>
        <select
          id="cart-district"
          value={districtId}
          onChange={(event) =>
            setDistrictId(event.target.value === "" ? "" : Number(event.target.value))
          }
          className="h-10 rounded-full border border-input bg-background px-4 text-sm"
        >
          <option value="">{t("selectDistrict")}</option>
          {(districts.data ?? []).map((district) => (
            <option key={district.id} value={district.id}>
              {locale === "bn" ? district.nameBn : district.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{t("districtHint")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4">
          {view.shops.map((shop) => (
            <Card key={shop.shopId} className="rounded-2xl">
              <CardContent className="grid gap-3">
                <Link href={`/shops/${shop.shopSlug}`} className="font-semibold hover:underline">
                  {shop.shopName}
                </Link>
                {districtId !== "" && shop.deliveryCharge === null ? (
                  <p className="text-xs text-destructive">{t("notDelivering")}</p>
                ) : null}
                <FreeDeliveryProgress shop={shop} locale={locale} />
                {shop.items.map((item) => (
                  <CartLine
                    key={item.variantId}
                    item={item}
                    locale={locale}
                    onQuantity={(next) =>
                      update.mutate({ variantId: item.variantId, quantity: next })
                    }
                    onRemove={() => remove.mutate(item.variantId)}
                    issueLabel={(code) => t(`issues.${code}`)}
                    removeLabel={t("remove")}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
        <CartSummary view={view} locale={locale} />
      </div>
    </div>
  );
}

function FreeDeliveryProgress({ shop, locale }: { shop: CartShopView; locale: string }) {
  const t = useTranslations("cart");
  if (shop.freeDeliveryAbove === null || shop.freeDeliveryAbove === undefined) {
    return null;
  }
  const threshold = Number(shop.freeDeliveryAbove);
  const subtotal = Number(shop.subtotal);
  if (!Number.isFinite(threshold) || threshold <= 0 || !Number.isFinite(subtotal)) {
    return null;
  }
  const remaining = Math.max(0, threshold - subtotal);
  const percent = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div className="grid gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {t("freeDelivery.remaining", {
          count: Math.ceil(remaining),
          amount: formatBdt(remaining, locale),
        })}
      </p>
    </div>
  );
}

function CartLine({
  item,
  locale,
  onQuantity,
  onRemove,
  issueLabel,
  removeLabel,
}: {
  item: CartItemView;
  locale: string;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  issueLabel: (code: string) => string;
  removeLabel: string;
}) {
  return (
    <div className="grid gap-2 border-t border-border pt-3 first:border-0 first:pt-0">
      <div className="flex items-center gap-3">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted/40">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.productName} className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/products/${item.slug}`} className="truncate font-medium hover:underline">
            {item.productName}
          </Link>
          <p className="text-sm text-muted-foreground">
            {item.variantName} · {formatBdt(item.unitPrice, locale)}
          </p>
        </div>
        <QuantityStepper quantity={item.quantity} onChange={onQuantity} />
        <span className="w-20 text-right font-medium">{formatBdt(item.lineTotal, locale)}</span>
        <Button variant="ghost" size="icon-sm" aria-label={removeLabel} onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
      {item.issues.length > 0 ? (
        <ul className="grid gap-1 text-xs text-destructive">
          {item.issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`}>
              {issueLabel(issue.code)}
              {typeof issue.available === "number" ? ` (${issue.available})` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CartSummary({ view, locale }: { view: CartView; locale: string }) {
  const t = useTranslations("cart");
  const hasIssues = view.shops.some((shop) => shop.items.some((item) => item.issues.length > 0));
  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm lg:sticky lg:top-24 lg:self-start">
      <CardContent className="grid gap-3">
        <div className="flex justify-between text-sm">
          <span>{t("subtotal")}</span>
          <span>{formatBdt(view.subtotal, locale)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>{t("delivery")}</span>
          <span>{formatBdt(view.deliveryTotal, locale)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-semibold">
          <span>{t("grandTotal")}</span>
          <span>{formatBdt(view.grandTotal, locale)}</span>
        </div>
        <Button
          asChild={!hasIssues}
          variant="cta"
          size="lg"
          disabled={hasIssues}
          title={hasIssues ? t("resolveIssues") : undefined}
        >
          {hasIssues ? <span>{t("checkout")}</span> : <Link href="/checkout">{t("checkout")}</Link>}
        </Button>
      </CardContent>
    </Card>
  );
}

function QuantityStepper({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-input">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="-"
        onClick={() => onChange(quantity - 1)}
      >
        <Minus />
      </Button>
      <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="+"
        onClick={() => onChange(quantity + 1)}
      >
        <Plus />
      </Button>
    </div>
  );
}

function EmptyCart() {
  const t = useTranslations("cart");
  return (
    <Card className="grid place-items-center gap-3 rounded-2xl p-10 text-center">
      <p className="font-medium">{t("empty")}</p>
      <p className="text-sm text-muted-foreground">{t("emptyHint")}</p>
      <Button asChild variant="cta">
        <Link href="/products">{t("continueShopping")}</Link>
      </Button>
    </Card>
  );
}
