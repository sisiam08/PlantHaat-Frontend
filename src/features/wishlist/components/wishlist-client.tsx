"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Heart } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { Price } from "@/components/product/price";
import { wishlistApi, type WishlistItemView } from "../api";

export function WishlistClient() {
  const t = useTranslations("wishlist");
  const tc = useTranslations("common");
  const tCatalog = useTranslations("catalog");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const list = useInfiniteQuery({
    queryKey: queryKeys.wishlist(),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => wishlistApi.list(pageParam),
    getNextPageParam: (last) => {
      const meta = last.meta;
      if (!meta) return undefined;
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
  });

  const remove = useMutation({
    mutationFn: (productId: string) => wishlistApi.remove(productId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      toast.success(t("removed"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (list.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (list.isError) {
    return <QueryError message={tc("sectionLoadFailed")} onRetry={() => void list.refetch()} />;
  }

  const seen = new Set<string>();
  const items: WishlistItemView[] = [];
  for (const page of list.data?.pages ?? []) {
    for (const item of page.data) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title={t("empty")}
        action={
          <Button asChild variant="cta">
            <Link href="/products">{t("startShopping")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const name =
            locale === "bn" && item.product.nameBn ? item.product.nameBn : item.product.name;
          const price = item.product.minPrice;
          return (
            <Card key={item.id}>
              <CardContent className="grid gap-3">
                <Link href={`/products/${item.product.slug}`} className="font-medium hover:underline">
                  {name}
                </Link>
                <div className="flex items-center justify-between text-sm">
                  {price ? <Price value={price} locale={locale} size="sm" /> : null}
                  {!item.product.inStock ? (
                    <span className="text-destructive">{t("outOfStock")}</span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(item.product.id)}
                >
                  {t("remove")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-2 pt-1">
        {list.hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            disabled={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            {list.isFetchingNextPage ? tc("loading") : tCatalog("loadMore")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

