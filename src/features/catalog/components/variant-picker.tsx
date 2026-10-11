"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { cartApi } from "@/features/cart/api";
import { addGuestLine } from "@/features/cart/guest-cart";
import { queryKeys } from "@/lib/api/query-keys";
import { formatBdt } from "@/lib/format/money";
import { ApiError } from "@/lib/api/common";
import { cn } from "cn";

export interface VariantView {
  id: string;
  name: string;
  price: string;
  stockQty: number;
  sizeLabel?: string | null;
}

export interface ProductSnapshot {
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
  const locale = useLocale();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(variants[0]?.id);
  const [adding, setAdding] = useState(false);
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];

  if (!selected) {
    return null;
  }

  const addToCart = async () => {
    setAdding(true);
    try {
      if (user) {
        await cartApi.putItem(selected.id, 1);
        await queryClient.invalidateQueries({ queryKey: queryKeys.cart });
      } else {
        addGuestLine({
          variantId: selected.id,
          quantity: 1,
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
      toast.error(
        error instanceof ApiError && error.code === "INSUFFICIENT_STOCK"
          ? t("outOfStock")
          : tCart("addFailed"),
      );
    } finally {
      setAdding(false);
    }
  };

  const inStock = selected.stockQty > 0;
  const outOfStock = !inStock;

  return (
    <div className="grid gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const active = variant.id === selected.id;
          return (
            <button
              key={variant.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedId(variant.id)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 bg-background hover:border-primary/40 hover:bg-muted",
              )}
            >
              {variant.sizeLabel || variant.name}
            </button>
          );
        })}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-heading text-3xl font-bold text-primary">
          {formatBdt(selected.price, locale)}
        </p>
        <p className={cn("text-sm", inStock ? "text-success" : "text-destructive")}>
          {inStock ? t("inStock", { count: selected.stockQty }) : t("outOfStock")}
        </p>
      </div>
      <Button
        variant="cta"
        size="lg"
        className={cn("w-full", embedded ? "inline-flex" : "hidden md:inline-flex")}
        disabled={adding || outOfStock}
        onClick={() => void addToCart()}
      >
        <ShoppingBag aria-hidden className="size-4" />
        {t("addToCart")}
      </Button>

      {embedded ? null : (
        <div className="fixed inset-x-0 bottom-14 z-30 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
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
          </div>
        </div>
      )}
    </div>
  );
}
