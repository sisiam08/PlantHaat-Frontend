"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  VariantPicker,
  type VariantView,
} from "@/features/catalog/components/variant-picker";
import { apiGet } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import type { ProductDetail } from "@/lib/api/types";

export interface QuickAddProduct {
  slug: string;
  name: string;
  imageUrl?: string | null;
  shopName?: string | null;
}

/**
 * Controlled quick-add sheet used by the single delegated card-action layer.
 * The list DTO does not expose variant counts yet (see BACKEND_CHANGE_REQUESTS),
 * so the sheet is the default path; single-variant products can add directly
 * once `purchasableVariantCount` exists.
 */
export function QuickAddSheet({
  product,
  open,
  onOpenChange,
}: {
  product: QuickAddProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tc = useTranslations("common");

  const detail = useQuery({
    queryKey: [...queryKeys.catalog.productLive(product?.slug ?? ""), "quick-add"],
    queryFn: () =>
      apiGet<ProductDetail>(`/products/${encodeURIComponent(product!.slug)}`).then(
        (result) => result.data,
      ),
    enabled: open && Boolean(product),
    staleTime: 60 * 1000,
    retry: 1,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="pr-8 text-left">{product?.name ?? ""}</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-6">
          {detail.isLoading ? (
            <div className="grid gap-3">
              <Skeleton className="h-10 w-40 rounded-full" />
              <Skeleton className="h-12 w-36" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          ) : detail.isError || !detail.data ? (
            <div className="grid gap-3 py-4">
              <p className="text-sm text-muted-foreground">{tc("sectionLoadFailed")}</p>
              <Button type="button" variant="outline" onClick={() => void detail.refetch()}>
                {tc("retry")}
              </Button>
            </div>
          ) : (
            <VariantPicker
              embedded
              variants={detail.data.variants as unknown as VariantView[]}
              product={{
                productId: detail.data.id,
                productName: detail.data.name,
                slug: detail.data.slug,
                imageUrl: product?.imageUrl ?? null,
                shopName: product?.shopName ?? null,
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
