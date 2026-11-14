"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  VariantPicker,
  type VariantView,
} from "@/features/catalog/components/variant-picker";
import { apiGet } from "@/lib/api/client";
import type { ProductDetail } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * Compact-card quick add. The list DTO does not expose variant counts yet, so
 * this always opens the sheet (see BACKEND_CHANGE_REQUESTS.md). Once the list
 * exposes `purchasableVariantCount`, a single-variant product can add directly.
 */
export function QuickAddButton({
  slug,
  productName,
  imageUrl,
  shopName,
}: {
  slug: string;
  productName: string;
  imageUrl?: string | null;
  shopName?: string | null;
}) {
  const t = useTranslations("product");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);

  const detail = useQuery({
    queryKey: [...queryKeys.catalog.productLive(slug), "quick-add"],
    queryFn: () =>
      apiGet<ProductDetail>(`/products/${encodeURIComponent(slug)}`).then(
        (result) => result.data,
      ),
    enabled: open,
    staleTime: 60 * 1000,
    retry: 1,
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="cta"
          size="icon-lg"
          aria-label={t("quickAdd")}
          className="rounded-full shadow-sm"
        >
          <Plus aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="pr-8 text-left">{productName}</SheetTitle>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => void detail.refetch()}
              >
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
                imageUrl: imageUrl ?? null,
                shopName: shopName ?? null,
              }}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
