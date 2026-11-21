"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatPriceRange } from "@/lib/format/money";
import { PLANT_PLACEHOLDER } from "@/lib/images/cloudinary-loader";
import { sellerApi } from "../api";
import { productStatusVariant } from "../status";
import type { ProductStatus } from "../types";

const PAGE_SIZE = 20;

const FILTERS: ("ALL" | ProductStatus)[] = [
  "ALL",
  "ACTIVE",
  "DRAFT",
  "PENDING_REVIEW",
  "INACTIVE",
  "REJECTED",
];

export function ProductsList({
  initialStatus,
  initialPage,
}: {
  initialStatus: string;
  initialPage: number;
}) {
  const t = useTranslations("seller.products");
  const tStatus = useTranslations("seller.productStatus");
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();

  const activeStatus = FILTERS.includes(initialStatus as "ALL" | ProductStatus)
    ? (initialStatus as "ALL" | ProductStatus)
    : "ALL";
  const page = Math.max(1, initialPage);

  const products = useQuery({
    queryKey: queryKeys.seller.products(),
    queryFn: sellerApi.listProducts,
    retry: false,
  });

  const go = (status: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.set("status", status);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/seller/products?${qs}` : "/seller/products");
  };

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACTIVE" | "INACTIVE" }) =>
      sellerApi.setProductStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.products() });
      toast.success(t("statusUpdated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const remove = useMutation({
    mutationFn: (id: string) => sellerApi.removeProduct(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.seller.products() });
      toast.success(t("removed"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const all = products.data?.data ?? [];
  const filtered =
    activeStatus === "ALL" ? all : all.filter((product) => product.status === activeStatus);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((filter) => (
            <Button
              key={filter}
              type="button"
              size="sm"
              variant={activeStatus === filter ? "secondary" : "ghost"}
              onClick={() => go(filter, 1)}
            >
              {filter === "ALL" ? t("all") : tStatus(filter)}
            </Button>
          ))}
        </div>
        <Button asChild variant="cta" size="sm">
          <Link href="/seller/products/new">{t("add")}</Link>
        </Button>
      </div>

      {products.isLoading ? (
        <div className="grid gap-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ) : null}

      {products.isError ? (
        <QueryError message={t("loadError")} onRetry={() => void products.refetch()} />
      ) : null}

      {!products.isLoading && !products.isError && filtered.length === 0 ? (
        <EmptyState
          title={t("empty")}
          action={
            <Button asChild variant="cta">
              <Link href="/seller/products/new">{t("add")}</Link>
            </Button>
          }
        />
      ) : null}

      <div className="grid gap-3">
        {items.map((product) => {
          const thumb =
            product.images.find((image) => image.isPrimary)?.url ?? product.images[0]?.url ?? null;
          const canActivate = product.status !== "ACTIVE";
          return (
            <Card key={product.id} className="rounded-2xl">
              <CardContent className="flex flex-wrap items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb ?? PLANT_PLACEHOLDER}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover"
                />
                <div className="grid min-w-0 flex-1 gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/seller/products/${product.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {locale === "bn" && product.nameBn ? product.nameBn : product.name}
                    </Link>
                    <Badge variant={productStatusVariant(product.status)}>
                      {tStatus(product.status)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatPriceRange(product.minPrice, product.maxPrice, locale)} ·{" "}
                    {product.variants.length} {t("variantsCount")} · {product.soldCount}{" "}
                    {t("sold")}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/seller/products/${product.id}`}>{t("edit")}</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={setStatus.isPending}
                    onClick={() =>
                      setStatus.mutate({
                        id: product.id,
                        status: canActivate ? "ACTIVE" : "INACTIVE",
                      })
                    }
                  >
                    {canActivate ? t("activate") : t("deactivate")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => setRemoveTarget(product.id)}
                  >
                    {t("remove")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("removeConfirmBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeTarget) remove.mutate(removeTarget);
                setRemoveTarget(null);
              }}
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => go(activeStatus, safePage - 1)}
          >
            {t("prev")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("pageOf", { page: safePage, total: totalPages })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => go(activeStatus, safePage + 1)}
          >
            {t("next")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
