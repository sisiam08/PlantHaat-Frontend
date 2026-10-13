"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { addressesApi } from "@/features/addresses/api";
import { useAuth } from "@/features/auth/auth-provider";
import { apiGet } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { District } from "@/lib/api/types";
import { formatBdt } from "@/lib/format/money";
import { formatCount } from "@/lib/format/number";
import { cartApi } from "../api";
import {
  getRememberedDistrictId,
  rememberDistrictId,
} from "../district-store";
import { removeGuestLine, setGuestQuantity } from "../guest-cart";
import type { CartItemView, CartShopView, CartView } from "../types";
import { useGuestCart } from "../use-guest-cart";
import {
  CartSummaryBox,
} from "./cart-summary";
import {
  QuantityStepper,
  ShopCardHeader,
  ShopDeliveryLine,
} from "./shop-bits";

export function CartClient() {
  const { user } = useAuth();
  const guestLines = useGuestCart();

  if (!user) {
    return <GuestCart lines={guestLines} />;
  }
  return <ServerCart />;
}

/* ── Guest cart (grouped by shop, delivery-neutral) ─────────────── */

function GuestCart({ lines }: { lines: ReturnType<typeof useGuestCart> }) {
  const t = useTranslations("cart");
  const locale = useLocale();

  if (lines.length === 0) {
    return <EmptyCart />;
  }

  const shops = new Map<string, typeof lines>();
  for (const line of lines) {
    const key = line.snapshot.shopName ?? "";
    const grouped = shops.get(key) ?? [];
    grouped.push(line);
    shops.set(key, grouped);
  }

  return (
    <div className="grid gap-4 pb-24">
      <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
        {t("guestNote")}
      </p>
      <p className="text-sm text-muted-foreground">{t("selectToSee")}</p>
      {[...shops.entries()].map(([shopName, shopLines]) => (
        <Card key={shopName || "no-shop"} className="rounded-2xl">
          <CardContent className="grid gap-3">
            {shopName ? (
              <p className="font-semibold">{shopName}</p>
            ) : null}
            {shopLines.map((line) => (
              <CartLine
                key={line.variantId}
                item={{
                  variantId: line.variantId,
                  productId: "",
                  productName: line.snapshot.productName,
                  variantName: line.snapshot.variantName,
                  slug: line.snapshot.slug,
                  image: line.snapshot.imageUrl ?? null,
                  unitPrice: line.snapshot.priceDisplay,
                  quantity: line.quantity,
                  lineTotal: line.snapshot.priceDisplay,
                  stockQty: 0,
                  issues: [],
                }}
                locale={locale}
                onQuantity={(next) => setGuestQuantity(line.variantId, next)}
                onRemove={() => removeGuestLine(line.variantId)}
                removeLabel={t("remove")}
              />
            ))}
          </CardContent>
        </Card>
      ))}
      <Button asChild variant="cta" size="lg">
        <Link href="/login?returnTo=/checkout">{t("loginToCheckout")}</Link>
      </Button>
    </div>
  );
}

/* ── Server cart (per-shop cards + shared summary) ──────────────── */

function ServerCart() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const districtSectionRef = useRef<HTMLDivElement | null>(null);

  // Remembered choice wins; otherwise a logged-in user falls back to their
  // default address's district (derived, no effect needed — ServerCart only
  // mounts on the client after the auth query resolves).
  const addresses = useQuery({
    queryKey: queryKeys.addresses,
    queryFn: addressesApi.list,
  });
  const [chosenDistrict, setChosenDistrict] = useState<number | "">(
    () => getRememberedDistrictId() ?? "",
  );
  const defaultAddress = addresses.data
    ? (addresses.data.find((address) => address.isDefault) ?? addresses.data[0])
    : undefined;
  const districtId = chosenDistrict !== "" ? chosenDistrict : (defaultAddress?.districtId ?? "");

  const districts = useQuery({
    queryKey: queryKeys.catalog.districts,
    queryFn: () => apiGet<District[]>("/locations/districts").then((result) => result.data),
  });

  const cartKey = [...queryKeys.cart, districtId === "" ? 0 : districtId];
  const cart = useQuery({
    queryKey: cartKey,
    queryFn: () => cartApi.get(districtId === "" ? undefined : districtId),
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
  const removeShop = useMutation({
    mutationFn: (shop: CartShopView) =>
      Promise.all(shop.items.map((item) => cartApi.removeItem(item.variantId))),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart }),
  });

  const changeDistrict = () => {
    districtSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    districtSectionRef.current?.querySelector("select")?.focus();
  };

  const onDistrictChange = (value: number | "") => {
    setChosenDistrict(value);
    rememberDistrictId(value === "" ? null : value);
  };

  if (cart.isLoading) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }
  if (cart.isError || !cart.data || cart.data.shops.length === 0) {
    return <EmptyCart />;
  }

  const view = cart.data;
  const notDelivering = view.shops.filter(
    (shop) => districtId !== "" && shop.deliveryCharge == null,
  );
  const hasIssues = view.shops.some((shop) =>
    shop.items.some((item) => item.issues.length > 0),
  );
  const blocked = hasIssues || notDelivering.length > 0;

  const checkoutActions = (
    <Button
      asChild={!blocked}
      variant="cta"
      size="lg"
      disabled={blocked}
      title={blocked ? t("resolveIssues") : undefined}
      className="w-full"
    >
      {blocked ? <span>{t("checkout")}</span> : <Link href="/checkout">{t("checkout")}</Link>}
    </Button>
  );

  return (
    <div className="grid gap-4 pb-28 lg:pb-0">
      <div ref={districtSectionRef} className="grid gap-1.5 sm:max-w-xs">
        <Label htmlFor="cart-district">{t("deliveryDistrict")}</Label>
        <select
          id="cart-district"
          value={districtId}
          onChange={(event) =>
            onDistrictChange(event.target.value === "" ? "" : Number(event.target.value))
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
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4">
          {view.shops.map((shop) => (
            <ShopCard
              key={shop.shopId}
              shop={shop}
              locale={locale}
              pending={update.isPending || remove.isPending || removeShop.isPending}
              noDistrictSelected={districtId === ""}
              onQuantity={(variantId, next) => update.mutate({ variantId, quantity: next })}
              onRemove={(variantId) => remove.mutate(variantId)}
              onRemoveAll={() => removeShop.mutate(shop)}
              onChangeDistrict={changeDistrict}
              issueLabel={(code) => t(`issues.${code}`)}
              removeLabel={t("remove")}
            />
          ))}
        </div>
        <CartSummaryBox view={view} actions={checkoutActions} fixedOnMobile={false} />
      </div>

      <CartSummaryBox view={view} actions={checkoutActions} fixedOnMobile />
    </div>
  );
}

/* ── One shop card: header, items, separated footer ─────────────── */

function ShopCard({
  shop,
  locale,
  pending,
  noDistrictSelected,
  onQuantity,
  onRemove,
  onRemoveAll,
  onChangeDistrict,
  issueLabel,
  removeLabel,
}: {
  shop: CartShopView;
  locale: string;
  pending: boolean;
  noDistrictSelected: boolean;
  onQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  onRemoveAll: () => void;
  onChangeDistrict: () => void;
  issueLabel: (code: string) => string;
  removeLabel: string;
}) {
  const t = useTranslations("cart");
  const notDelivering = shop.deliveryCharge == null;
  const shopTotal =
    shop.subtotal != null && shop.deliveryCharge != null
      ? formatBdt(Number(shop.subtotal) + Number(shop.deliveryCharge), locale)
      : "";

  return (
    <Card className={notDelivering ? "rounded-2xl border-warning/50" : "rounded-2xl"}>
      <CardContent className="grid gap-3">
        <ShopCardHeader shop={{ ...shop.shop, name: shop.shopName, slug: shop.shopSlug }} />

        {notDelivering && !noDistrictSelected ? (
          <div className="grid gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3">
            <p className="flex items-center gap-2 text-sm font-medium text-warning-foreground">
              <AlertTriangle aria-hidden className="size-4" />
              {t("notDeliveringTitle")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={onChangeDistrict}>
                {t("changeDistrict")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={onRemoveAll}
              >
                {t("removeTheseItems")}
              </Button>
            </div>
          </div>
        ) : null}

        {shop.items.map((item) => (
          <CartLine
            key={item.variantId}
            item={item}
            locale={locale}
            onQuantity={(next) => onQuantity(item.variantId, next)}
            onRemove={() => onRemove(item.variantId)}
            issueLabel={issueLabel}
            removeLabel={removeLabel}
          />
        ))}

        <div className="grid gap-1.5 rounded-xl bg-muted/50 p-3">
          <div className="flex justify-between text-sm">
            <span>{t("itemsSubtotal")}</span>
            <span>{formatBdt(shop.subtotal, locale)}</span>
          </div>
          <ShopDeliveryLine
            shop={shop}
            hint={noDistrictSelected ? t("selectToSee") : t("notDelivering")}
          />
          <FreeDeliveryProgress shop={shop} locale={locale} />
          {!notDelivering ? (
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
              <span>{t("shopTotal")}</span>
              <span data-shop-total={shop.shopId}>{shopTotal}</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Free-delivery progress per shop ────────────────────────────── */

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

/* ── One cart line ──────────────────────────────────────────────── */

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
  issueLabel?: (code: string) => string;
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
            {item.variantName} · {formatBdt(item.unitPrice, locale)} ·{" "}
            {formatCount(item.quantity, locale)}
          </p>
        </div>
        <QuantityStepper quantity={item.quantity} onChange={onQuantity} />
        <span className="w-20 text-right font-medium">{formatBdt(item.lineTotal, locale)}</span>
        <Button variant="ghost" size="icon-sm" aria-label={removeLabel} onClick={onRemove}>
          <Trash2 />
        </Button>
      </div>
      {item.issues.length > 0 && issueLabel ? (
        <ul className="grid gap-1 text-xs text-destructive">
          {item.issues.map((issue, index) => (
            <li key={`${issue.code}-${index}`}>
              {issueLabel(issue.code)}
              {typeof issue.available === "number"
                ? ` (${formatCount(issue.available, locale)})`
                : ""}
            </li>
          ))}
        </ul>
      ) : null}
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
