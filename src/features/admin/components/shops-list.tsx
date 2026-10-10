"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { shopStatusVariant } from "../status";
import { Pager } from "./pager";

const PAGE_SIZE = 20;
const STATUSES = ["ALL", "PENDING", "ACTIVE", "SUSPENDED", "REJECTED"] as const;

export function ShopsList({
  initialStatus,
  initialPage,
}: {
  initialStatus: string;
  initialPage: number;
}) {
  const t = useTranslations("admin.shops");
  const tStatus = useTranslations("admin.shopStatus");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const queryClient = useQueryClient();

  const status = (STATUSES as readonly string[]).includes(initialStatus) ? initialStatus : "ALL";
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: queryKeys.admin.shops({ status, page }),
    queryFn: () =>
      adminApi.listShops({
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
    router.push(qs ? `/admin/shops?${qs}` : "/admin/shops");
  };

  const toggle = useMutation({
    mutationFn: async ({ id, suspend }: { id: string; suspend: boolean }) => {
      if (suspend) {
        await adminApi.suspendShop(id);
      } else {
        await adminApi.reactivateShop(id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.shops() });
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1">
        {STATUSES.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={status === value ? "secondary" : "ghost"}
            onClick={() => go(value, 1)}
          >
            {value === "ALL" ? tCommon("all") : tStatus(value)}
          </Button>
        ))}
      </div>

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((shop) => (
          <Card key={shop.id} className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{shop.name}</span>
                  <Badge variant={shopStatusVariant(shop.status)}>{tStatus(shop.status)}</Badge>
                  {shop.isOnVacation ? (
                    <Badge variant="secondary">{t("onVacation")}</Badge>
                  ) : null}
                </div>
                <span className="text-xs text-muted-foreground">
                  {shop.sellerProfile.businessName} · {t("rating", { rating: Number(shop.ratingAvg).toFixed(1), count: shop.ratingCount })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {shop.district ?? "-"} · {formatLatinDateTime(shop.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {shop.status === "SUSPENDED" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate({ id: shop.id, suspend: false })}
                  >
                    {t("reactivate")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={toggle.isPending}
                    onClick={() => {
                      if (window.confirm(t("suspendConfirm"))) {
                        toggle.mutate({ id: shop.id, suspend: true });
                      }
                    }}
                  >
                    {t("suspend")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {meta ? <Pager page={meta.page} totalPages={meta.totalPages} onPage={(p) => go(status, p)} /> : null}
    </div>
  );
}
