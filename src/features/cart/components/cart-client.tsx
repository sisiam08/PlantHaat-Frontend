"use client";

import { AlertTriangle, ShoppingBag, Trash2 } from "lucide-react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { PlantImage } from "@/components/plant-image";
import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { addressesApi } from "@/features/addresses/api";
import { useAuth } from "@/features/auth/auth-provider";
import { apiGet } from "@/lib/api/client";
import { ApiError } from "@/lib/api/common";
import { queryKeys } from "@/lib/api/query-keys";
import type { District } from "@/lib/api/types";
import { formatBdt } from "@/lib/format/money";
import { Price } from "@/components/product/price";
import { QuantityLine } from "@/components/product/quantity-line";
import { formatCount } from "@/lib/format/number";
import { cartApi } from "../api";
import { getRememberedDistrictId, rememberDistrictId } from "../district-store";
import { removeGuestLine, setGuestQuantity } from "../guest-cart";
import type { CartItemView, CartShopView, CartView } from "../types";
import { useGuestCart } from "../use-guest-cart";
import { CartSummaryBox } from "./cart-summary";
import { QuantityStepper, ShopCardHeader, ShopDeliveryLine } from "./shop-bits";

export function CartClient() {
  const { user } = useAuth();
  const guestLines = useGuestCart();

  if (!user) {
    return <GuestCart lines={guestLines} />;
  }
  return <ServerCart />;
}

/* ── Guest cart (grouped by shop, delivery-neutral) ─────────────── */

function parseGuestPrice(value: string): number | null {
  const bengali = "০১২৩৪৫৬৭৮৯";
  const normalized = value
    .replace(/[০-৯]/g, (digit) => String(bengali.indexOf(digit)))
    .replace(/[^0-9.]/g, "");
  return normalized ? Number(normalized) : null;
}

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
            {shopName ? <p className="font-semibold">{shopName}</p> : null}
            {shopLines.map((line) => {
              const unitPrice =
                line.snapshot.unitPrice != null
                  ? Number(line.snapshot.unitPrice)
                  : parseGuestPrice(line.snapshot.priceDisplay);
              const lineTotal = unitPrice == null ? null : unitPrice * line.quantity;
              return (
                <CartLine
                  key={line.variantId}
                  item={{
                    variantId: line.variantId,
                    productId: "",
                    productName: line.snapshot.productName,
                    variantName: line.snapshot.variantName,
                    slug: line.snapshot.slug,
                    image: line.snapshot.imageUrl ?? null,
                    unitPrice: unitPrice == null ? "" : String(unitPrice),
                    quantity: line.quantity,
                    lineTotal: lineTotal == null ? "" : String(lineTotal),
                    stockQty: 0,
                    priceChanged: false,
                    priceChangedFrom: null,
                    priceChangedTo: null,
                    issues: [],
                  }}
                  locale={locale}
                  onQuantity={(next) => setGuestQuantity(line.variantId, next)}
                  onRemove={() => removeGuestLine(line.variantId)}
                  removeLabel={t("remove")}
                />
              );
            })}
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
  const tc = useTranslations("common");
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

  const cartKey = useMemo(
    () => [...queryKeys.cart, districtId === "" ? 0 : districtId],
    [districtId],
  );
  const cart = useQuery({
    queryKey: cartKey,
    queryFn: () => cartApi.get(districtId === "" ? undefined : districtId),
    placeholderData: keepPreviousData,
  });

  const tErrors = useTranslations("errors");
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latestSeq = useRef(0);
  const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const pendingTimers = timers.current;
    return () => {
      for (const timer of pendingTimers.values()) clearTimeout(timer);
      pendingTimers.clear();
    };
  }, []);

  const applyOptimistic = (variantId: string, quantity: number) => {
    queryClient.setQueryData<CartView>(cartKey, (previous) =>
      previous ? recomputeCart(withOptimisticQuantity(previous, variantId, quantity)) : previous,
    );
  };

  // Debounce per line. Every click updates the UI immediately; the latest
  // quantity is sent once the user pauses. A newer click invalidates the
  // response of any older in-flight request (latest-wins).
  const scheduleQuantity = (variantId: string, quantity: number) => {
    setQuantityErrors((previous) => {
      if (!(variantId in previous)) return previous;
      const next = { ...previous };
      delete next[variantId];
      return next;
    });
    applyOptimistic(variantId, quantity);

    const existing = timers.current.get(variantId);
    if (existing) clearTimeout(existing);
    const seq = ++latestSeq.current;
    const timer = setTimeout(() => {
      timers.current.delete(variantId);
      update.mutate({ variantId, quantity, seq });
    }, 350);
    timers.current.set(variantId, timer);
  };

  const removeNow = (variantId: string) => {
    applyOptimistic(variantId, 0);
    update.mutate({ variantId, quantity: 0, seq: ++latestSeq.current });
  };

  const update = useMutation({
    mutationFn: ({ variantId, quantity }: { variantId: string; quantity: number; seq: number }) =>
      quantity <= 0 ? cartApi.removeItem(variantId) : cartApi.putItem(variantId, quantity),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: cartKey });
      return { previous: queryClient.getQueryData<CartView>(cartKey) };
    },
    onError: (error, variables, context) => {
      if (variables.seq !== latestSeq.current) return;
      if (context?.previous) queryClient.setQueryData(cartKey, context.previous);
      const message =
        error instanceof ApiError && error.message ? error.message : tErrors("generic");
      setQuantityErrors((previous) => ({ ...previous, [variables.variantId]: message }));
      toast.error(message);
    },
    onSuccess: (_data, variables) => {
      if (variables.seq !== latestSeq.current) return;
      // The PUT response has no district delivery context. Reconcile with a
      // district-scoped GET instead of writing that partial view into the cache.
      void queryClient.invalidateQueries({ queryKey: cartKey });
    },
  });

  const removeShop = useMutation({
    mutationFn: (shop: CartShopView) =>
      Promise.all(shop.items.map((item) => cartApi.removeItem(item.variantId))),
    onMutate: async (shop) => {
      await queryClient.cancelQueries({ queryKey: cartKey });
      const previous = queryClient.getQueryData<CartView>(cartKey);
      if (previous) {
        queryClient.setQueryData(cartKey, {
          ...recomputeCart(previous),
          shops: previous.shops.filter((entry) => entry.shopId !== shop.shopId),
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(cartKey, context.previous);
      toast.error(tErrors("generic"));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: cartKey }),
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
  if (cart.isError && !cart.data) {
    return <QueryError message={tc("sectionLoadFailed")} onRetry={() => void cart.refetch()} />;
  }
  if (!cart.data || cart.data.shops.length === 0) {
    return <EmptyCart />;
  }

  const view = cart.data;
  const notDelivering = view.shops.filter((shop) => shop.deliverable === false);
  const hasIssues = view.shops.some((shop) => shop.items.some((item) => item.issues.length > 0));
  const blocked = hasIssues || notDelivering.length > 0;

  const checkoutActions = (
    <Button
      data-cart-checkout
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
    <div className="grid gap-4 pb-[calc(var(--flowbar-h)+1.5rem+env(safe-area-inset-bottom))] lg:pb-0">
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

      {cart.isError && cart.data ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {t("deliveryUpdateError")}
        </div>
      ) : null}

      {view.priceChanged ? (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
          {t("priceChangedBanner", { count: view.changedLineCount })}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:gap-6">
        <div className="grid gap-4 lg:gap-5">
          {view.shops.map((shop) => (
            <ShopCard
              key={shop.shopId}
              shop={shop}
              locale={locale}
              pending={update.isPending || removeShop.isPending || cart.isFetching}
              noDistrictSelected={districtId === ""}
              onQuantity={(variantId, next) => scheduleQuantity(variantId, next)}
              onRemove={removeNow}
              quantityErrors={quantityErrors}
              onRemoveAll={() => removeShop.mutate(shop)}
              onChangeDistrict={changeDistrict}
              issueLabel={(code) => t(`issues.${code}`)}
              removeLabel={t("remove")}
            />
          ))}
        </div>
        <CartSummaryBox
          view={view}
          actions={checkoutActions}
          showMobileBar
          hasDistrict={districtId !== ""}
          updating={cart.isFetching || update.isPending}
          deliveryError={cart.isError && Boolean(cart.data)}
        />
      </div>
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
  quantityErrors,
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
  quantityErrors: Record<string, string>;
}) {
  const t = useTranslations("cart");
  const notDelivering = shop.deliverable === false;
  const shopTotal =
    shop.subtotal != null && shop.deliveryCharge != null
      ? Number(shop.subtotal) + Number(shop.deliveryCharge)
      : null;

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
              <Button variant="ghost" size="sm" disabled={pending} onClick={onRemoveAll}>
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
            quantityError={quantityErrors[item.variantId]}
          />
        ))}

        <div className="grid gap-2 rounded-xl bg-muted/50 p-4">
          <div className="flex justify-between text-sm">
            <span>{t("itemsSubtotal")}</span>
            <Price value={shop.subtotal} locale={locale} size="sm" />
          </div>
          <ShopDeliveryLine
            shop={shop}
            hint={noDistrictSelected ? t("selectToSee") : t("notDelivering")}
            unavailable={notDelivering}
            updating={pending && !noDistrictSelected}
          />
          <FreeDeliveryProgress shop={shop} locale={locale} />
          {!notDelivering ? (
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
              <span>{t("shopTotal")}</span>
              <span data-shop-total={shop.shopId}>
                {shopTotal != null ? <Price value={shopTotal} locale={locale} size="sm" /> : null}
              </span>
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
  quantityError,
}: {
  item: CartItemView;
  locale: string;
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
  issueLabel?: (code: string) => string;
  removeLabel: string;
  quantityError?: string;
}) {
  const t = useTranslations("cart");
  return (
    <div
      data-cart-line
      className="grid gap-2 border-t border-border pt-3 first:border-0 first:pt-0"
    >
      <div className="grid grid-cols-[64px_minmax(0,1fr)_44px] items-start gap-3 md:grid-cols-[72px_minmax(0,1fr)_auto_112px_44px] md:items-center md:gap-4">
        <div className="relative row-span-2 size-16 shrink-0 overflow-hidden rounded-xl bg-muted/40 md:row-span-1 md:size-[72px]">
          <PlantImage src={item.image} alt={item.productName} fill sizes="72px" />
        </div>

        <div data-cart-info className="col-start-2 row-start-1 min-w-0">
          <Link
            href={`/products/${item.slug}`}
            title={item.productName}
            className="line-clamp-2 font-medium hover:underline"
          >
            {item.productName}
          </Link>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={item.variantName}>
            {item.variantName}
          </p>
          <div data-cart-unit className="mt-1">
            <QuantityLine quantity={item.quantity} unitPrice={item.unitPrice} locale={locale} />
          </div>
        </div>

        <div
          data-cart-stepper
          className="col-start-2 row-start-2 justify-self-start md:col-start-3 md:row-start-1 md:justify-self-end"
        >
          <QuantityStepper quantity={item.quantity} onChange={onQuantity} />
        </div>

        <div
          data-cart-line-total
          className="col-start-3 row-start-2 shrink-0 justify-self-end text-right font-semibold tabular-nums md:col-start-4 md:row-start-1"
        >
          <Price value={item.lineTotal} locale={locale} size="sm" />
        </div>

        <Button
          variant="ghost"
          size="icon-lg"
          className="col-start-3 row-start-1 shrink-0 md:col-start-5 md:row-start-1"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
      {quantityError ? <p className="text-xs text-destructive">{quantityError}</p> : null}
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
      {item.priceChanged ? (
        <p className="text-xs text-warning-foreground">
          {t("priceChangedLine", {
            from: formatBdt(item.priceChangedFrom ?? "0", locale),
            to: formatBdt(item.priceChangedTo ?? item.unitPrice, locale),
          })}
        </p>
      ) : null}
    </div>
  );
}

/** Applies an optimistic quantity (0 removes the line) without touching money. */
function recomputeCart(view: CartView): CartView {
  let subtotal = 0;
  let deliveryTotal = 0;
  let itemCount = 0;

  const shops = view.shops.map((shop) => {
    let shopSubtotal = 0;
    const items = shop.items.map((item) => {
      const unitPrice = Number(item.unitPrice);
      const lineTotal = Number.isFinite(unitPrice) ? unitPrice * item.quantity : 0;
      shopSubtotal += lineTotal;
      itemCount += item.quantity;
      return { ...item, lineTotal: String(lineTotal) };
    });

    let deliveryCharge = shop.deliveryCharge == null ? null : Number(shop.deliveryCharge);
    const freeAbove = shop.freeDeliveryAbove == null ? null : Number(shop.freeDeliveryAbove);
    if (
      deliveryCharge != null &&
      freeAbove != null &&
      Number.isFinite(freeAbove) &&
      shopSubtotal >= freeAbove
    ) {
      deliveryCharge = 0;
    }
    if (deliveryCharge != null && Number.isFinite(deliveryCharge)) {
      deliveryTotal += deliveryCharge;
    }

    return {
      ...shop,
      items,
      subtotal: String(shopSubtotal),
      deliveryCharge: deliveryCharge == null ? null : String(deliveryCharge),
    };
  });

  subtotal = shops.reduce((sum, shop) => sum + Number(shop.subtotal), 0);
  return {
    ...view,
    shops,
    subtotal: String(subtotal),
    deliveryTotal: String(deliveryTotal),
    grandTotal: String(subtotal + deliveryTotal),
    itemCount,
  };
}

function withOptimisticQuantity(view: CartView, variantId: string, quantity: number): CartView {
  const shops = view.shops.flatMap((shop) => {
    const items = shop.items.flatMap((item) =>
      item.variantId === variantId ? (quantity <= 0 ? [] : [{ ...item, quantity }]) : [item],
    );
    return items.length === 0 ? [] : [{ ...shop, items }];
  });
  return { ...view, shops };
}

function EmptyCart() {
  const t = useTranslations("cart");
  return (
    <EmptyState
      icon={ShoppingBag}
      title={t("empty")}
      description={t("emptyHint")}
      action={
        <Button asChild variant="cta">
          <Link href="/products">{t("continueShopping")}</Link>
        </Button>
      }
    />
  );
}
