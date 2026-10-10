"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatBdt } from "@/lib/format/money";
import { wishlistApi } from "../api";

export function WishlistClient() {
  const t = useTranslations("wishlist");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: queryKeys.wishlist(),
    queryFn: () => wishlistApi.list(),
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

  const items = list.data?.data ?? [];
  if (items.length === 0) {
    return (
      <div className="grid gap-3 text-center">
        <p className="text-muted-foreground">{t("empty")}</p>
        <div>
          <Button asChild variant="cta">
            <Link href="/products">{t("startShopping")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const name = locale === "bn" && item.product.nameBn ? item.product.nameBn : item.product.name;
        const price = item.product.minPrice ? formatBdt(item.product.minPrice, locale) : null;
        return (
          <Card key={item.id}>
            <CardContent className="grid gap-3">
              <Link href={`/products/${item.product.slug}`} className="font-medium hover:underline">
                {name}
              </Link>
              <div className="flex items-center justify-between text-sm">
                {price ? <span>{price}</span> : null}
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
  );
}
