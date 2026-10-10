"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatPriceRange } from "@/lib/format/money";
import { adminApi } from "../api";
import { productStatusVariant } from "../status";
import type { ProductStatus } from "../types";
import { Pager } from "./pager";

const PAGE_SIZE = 20;
const FILTERS: ("ALL" | ProductStatus)[] = [
  "ALL",
  "PENDING_REVIEW",
  "DRAFT",
  "ACTIVE",
  "INACTIVE",
  "REJECTED",
  "REMOVED",
];

type ReasonAction = { id: string; kind: "reject" | "remove" } | null;

export function ProductsModeration({
  initialStatus,
  initialPage,
}: {
  initialStatus: string;
  initialPage: number;
}) {
  const t = useTranslations("admin.products");
  const tStatus = useTranslations("admin.productStatus");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [reasonAction, setReasonAction] = useState<ReasonAction>(null);
  const [reason, setReason] = useState("");

  const status = FILTERS.includes(initialStatus as "ALL" | ProductStatus)
    ? (initialStatus as "ALL" | ProductStatus)
    : "ALL";
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: queryKeys.admin.products({ status, page }),
    queryFn: () =>
      adminApi.listProducts({
        status: status === "ALL" ? undefined : status,
        page,
        limit: PAGE_SIZE,
      }),
    retry: false,
  });

  const go = (nextStatus: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/admin/products?${qs}` : "/admin/products");
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.products() });

  const approve = useMutation({
    mutationFn: (id: string) => adminApi.approveProduct(id),
    onSuccess: async () => {
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const withReason = useMutation({
    mutationFn: ({ id, kind, value }: { id: string; kind: "reject" | "remove"; value: string }) =>
      kind === "reject" ? adminApi.rejectProduct(id, value) : adminApi.removeProduct(id, value),
    onSuccess: async () => {
      setReasonAction(null);
      setReason("");
      await invalidate();
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            type="button"
            size="sm"
            variant={status === filter ? "secondary" : "ghost"}
            onClick={() => go(filter, 1)}
          >
            {filter === "ALL" ? tCommon("all") : tStatus(filter)}
          </Button>
        ))}
      </div>

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((product) => {
          const reasonOpen = reasonAction?.id === product.id ? reasonAction : null;
          return (
          <Card key={product.id} className="rounded-2xl">
            <CardContent className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="grid min-w-0 gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {locale === "bn" && product.nameBn ? product.nameBn : product.name}
                    </span>
                    <Badge variant={productStatusVariant(product.status)}>
                      {tStatus(product.status)}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t("shop")}: {product.shop.name} · {product.category?.name ?? "-"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatPriceRange(product.minPrice, product.maxPrice, locale)} · {t("sold")}:{" "}
                    {product.soldCount}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.status !== "ACTIVE" ? (
                    <Button
                      type="button"
                      variant="cta"
                      size="sm"
                      disabled={approve.isPending}
                      onClick={() => approve.mutate(product.id)}
                    >
                      {t("approve")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReason("");
                      setReasonAction({ id: product.id, kind: "reject" });
                    }}
                  >
                    {t("reject")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReason("");
                      setReasonAction({ id: product.id, kind: "remove" });
                    }}
                  >
                    {t("remove")}
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={`/products/${product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("view")}
                    </Link>
                  </Button>
                </div>
              </div>

              {product.rejectionReason ? (
                <p className="text-xs text-destructive">
                  {t("rejectionReason")}: {product.rejectionReason}
                </p>
              ) : null}

              {reasonOpen ? (
                <div className="grid gap-2 rounded-xl border border-border p-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`reason-${product.id}`}>{t("reason")}</Label>
                    <Input
                      id={`reason-${product.id}`}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="cta"
                      disabled={withReason.isPending || reason.trim().length < 3}
                      onClick={() =>
                        withReason.mutate({
                          id: product.id,
                          kind: reasonOpen.kind,
                          value: reason.trim(),
                        })
                      }
                    >
                      {reasonOpen.kind === "reject" ? t("confirmReject") : t("confirmRemove")}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setReasonAction(null)}>
                      {tCommon("cancel")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
          );
        })}
      </div>

      {meta ? <Pager page={meta.page} totalPages={meta.totalPages} onPage={(p) => go(status, p)} /> : null}
    </div>
  );
}
