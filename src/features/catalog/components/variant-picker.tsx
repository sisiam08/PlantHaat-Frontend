"use client";

import { useQueryClient } from "@tanstack/react-query";
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
}: {
  variants: VariantView[];
  product: ProductSnapshot;
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
      toast.error(error instanceof ApiError && error.code === "INSUFFICIENT_STOCK" ? t("outOfStock") : tCart("addFailed"));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <Button
            key={variant.id}
            type="button"
            size="sm"
            variant={variant.id === selected.id ? "default" : "outline"}
            aria-pressed={variant.id === selected.id}
            onClick={() => setSelectedId(variant.id)}
          >
            {variant.sizeLabel || variant.name}
          </Button>
        ))}
      </div>
      <p className="text-3xl font-bold text-primary">{formatBdt(selected.price, locale)}</p>
      <p className="text-sm text-muted-foreground">
        {selected.stockQty > 0 ? t("inStock", { count: selected.stockQty }) : t("outOfStock")}
      </p>
      <Button
        variant="cta"
        size="lg"
        disabled={adding || selected.stockQty <= 0}
        onClick={() => void addToCart()}
      >
        {t("addToCart")}
      </Button>
    </div>
  );
}
