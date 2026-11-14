"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Loader2, Minus, Plus, ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FixedBar } from "@/components/layout/fixed-bar";
import { useAuth } from "@/features/auth/auth-provider";
import { cartApi } from "@/features/cart/api";
import { addGuestLine } from "@/features/cart/guest-cart";
import type { CartView } from "@/features/cart/types";
import { wishlistApi } from "@/features/wishlist/api";
import { ApiError } from "@/lib/api/common";
import { apiGet } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProductDetail } from "@/lib/api/types";
import { formatBdt } from "@/lib/format/money";
import { cn } from "cn";

const MAX_QTY = 20;

export interface VariantView {
  id: string;
  name: string;
  price: string;
  compareAtPrice?: string | null;
  stockQty: number;
  sizeLabel?: string | null;
}

export interface ProductSnapshot {
  productId: string;
  productName: string;
  slug: string;
  imageUrl?: string | null;
  shopName?: string | null;
}

export function VariantPicker({
  variants,
  product,
  embedded = false,
}: {
  variants: VariantView[];
  product: ProductSnapshot;
  embedded?: boolean;
}) {
  const t = useTranslations("product");
  const tCart = useTranslations("cart");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(variants[0]?.id);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  // Live price/stock island: the cached page HTML can be stale, so refetch the
  // product once on the full product page (short staleTime).
  const live = useQuery({
    queryKey: queryKeys.catalog.productLive(product.slug),
    queryFn: () =>
      apiGet<ProductDetail>(`/products/${encodeURIComponent(product.slug)}`).then(
        (result) => result.data,
      ),
    staleTime: 60 * 1000,
    enabled: !embedded,
    retry: 1,
  });
  const liveVariants = live.data?.variants as unknown as VariantView[] | undefined;
  const source = liveVariants && liveVariants.length > 0 ? liveVariants : variants;

  const selected = source.find((variant) => variant.id === selectedId) ?? source[0];

  const wishlist = useQuery({
    queryKey: queryKeys.wishlist(),
    queryFn: () => wishlistApi.list(1),
    enabled: Boolean(user),
    staleTime: 60 * 1000,
  });
  const inWishlist =
    wishlist.data?.data.some((item) => item.product.slug === product.slug) ?? false;
  const [wishlistBusy, setWishlistBusy] = useState(false);
  // Optimistic override so the heart flips instantly on click.
  const [optimisticWishlist, setOptimisticWishlist] = useState<boolean | null>(null);
  const shownInWishlist = optimisticWishlist ?? inWishlist;

  if (!selected) {
    return null;
  }

  const inStock = selected.stockQty > 0;
  const outOfStock = !inStock;
  const clampedQty = Math.min(quantity, Math.max(selected.stockQty, 1), MAX_QTY);
  const compareAt = Number(selected.compareAtPrice ?? 0);
  const showCompareAt = Number.isFinite(compareAt) && compareAt > Number(selected.price);

  const addToCart = async () => {
    setAdding(true);
    const previous = user ? queryClient.getQueryData<CartView>(queryKeys.cart) : undefined;
    if (user && previous) {
      queryClient.setQueryData<CartView>(queryKeys.cart, {
        ...previous,
        itemCount: previous.itemCount + clampedQty,
      });
    }
    try {
      if (user) {
        await cartApi.putItem(selected.id, clampedQty);
        await queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      } else {
        addGuestLine({
          variantId: selected.id,
          quantity: clampedQty,
          snapshot: {
            productName: product.productName,
            variantName: selected.sizeLabel || selected.name,
            slug: product.slug,
            priceDisplay: formatBdt(selected.price, locale),
            imageUrl: product.imageUrl ?? null,
            shopName: product.shopName ?? null,
          },
        });
      }
      toast.success(tCart("added"));
    } catch (error) {
      if (user && previous) {
        queryClient.setQueryData<CartView>(queryKeys.cart, previous);
      }
      toast.error(
        error instanceof ApiError && error.code === "INSUFFICIENT_STOCK"
          ? t("outOfStock")
          : tCart("addFailed"),
      );
    } finally {
      setAdding(false);
    }
  };

  const toggleWishlist = async () => {
    if (!user) {
      router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !shownInWishlist;
    setOptimisticWishlist(next);
    setWishlistBusy(true);
    try {
      if (next) {
        await wishlistApi.add(product.productId);
        toast.success(t("wishlistAdded"));
      } else {
        await wishlistApi.remove(product.productId);
        toast.success(t("wishlistRemoved"));
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.wishlist() });
      setOptimisticWishlist(null);
    } catch {
      setOptimisticWishlist(null);
      toast.error(tErrors("generic"));
    } finally {
      setWishlistBusy(false);
    }
  };

  return (
    <div className="grid gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      {source.length > 1 ? (
        <div role="radiogroup" aria-label={t("variantLabel")} className="flex flex-wrap gap-2">
          {source.map((variant, index) => {
            const active = variant.id === selected.id;
            const move = (delta: number) => {
              const next = source[(index + delta + source.length) % source.length];
              setSelectedId(next.id);
              const buttons = (document.activeElement?.parentElement?.querySelectorAll(
                "button[role=radio]",
              ) ?? []) as NodeListOf<HTMLButtonElement>;
              buttons[(index + delta + source.length) % source.length]?.focus();
            };
            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setSelectedId(variant.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    event.preventDefault();
                    move(1);
                  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    event.preventDefault();
                    move(-1);
                  }
                }}
                className={cn(
                  "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:border-primary/40 hover:bg-muted",
                )}
              >
                {variant.sizeLabel || variant.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex items-baseline gap-2">
        <p className="font-heading text-3xl font-bold text-primary">
          {formatBdt(selected.price, locale)}
        </p>
        {showCompareAt ? (
          <p className="text-sm text-muted-foreground line-through">
            {formatBdt(selected.compareAtPrice, locale)}
          </p>
        ) : null}
        <p className={cn("ml-auto text-sm", inStock ? "text-success" : "text-destructive")}>
          {inStock
            ? selected.stockQty <= 3
              ? t("lowStock", { count: selected.stockQty })
              : t("inStock", { count: selected.stockQty })
            : t("outOfStock")}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{t("quantity")}</span>
        <div className="inline-flex items-center rounded-full border border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("decreaseQty")}
            disabled={quantity <= 1}
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
          >
            <Minus aria-hidden />
          </Button>
          <span className="w-10 text-center text-sm font-medium tabular-nums">{clampedQty}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("increaseQty")}
            disabled={quantity >= Math.min(MAX_QTY, Math.max(selected.stockQty, 1))}
            onClick={() => setQuantity((value) => Math.min(MAX_QTY, value + 1))}
          >
            <Plus aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="cta"
          size="lg"
          className={cn("flex-1", embedded ? "inline-flex" : "hidden md:inline-flex")}
          disabled={adding || outOfStock}
          onClick={() => void addToCart()}
        >
          {adding ? (
            <Loader2 aria-hidden className="size-4 animate-spin" />
          ) : (
            <ShoppingBag aria-hidden className="size-4" />
          )}
          {outOfStock ? t("outOfStock") : t("addToCart")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          aria-label={shownInWishlist ? t("wishlistRemove") : t("wishlistAdd")}
          aria-pressed={shownInWishlist}
          disabled={wishlistBusy}
          onClick={() => void toggleWishlist()}
        >
          <Heart aria-hidden className={cn(shownInWishlist && "fill-offer text-offer")} />
        </Button>
      </div>

      {embedded ? null : (
        <FixedBar className="md:hidden">
          <div className="min-w-0 flex-1">
            <p className="font-heading truncate text-lg font-bold text-primary">
              {formatBdt(selected.price, locale)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {selected.sizeLabel || selected.name}
            </p>
          </div>
          <Button
            variant="cta"
            disabled={adding || outOfStock}
            onClick={() => void addToCart()}
          >
            {outOfStock ? t("outOfStock") : t("addToCart")}
          </Button>
        </FixedBar>
      )}
    </div>
  );
}
