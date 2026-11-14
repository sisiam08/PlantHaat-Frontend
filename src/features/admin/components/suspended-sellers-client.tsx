"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Price } from "@/components/product/price";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import type { SuspendedSellerOpenOrders } from "../types";

export function SuspendedSellersClient() {
  const t = useTranslations("admin.suspendedSellers");
  const tStatus = useTranslations("admin.orderStatus");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<SuspendedSellerOpenOrders | null>(null);
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);

  const list = useQuery({
    queryKey: ["admin", "suspended-sellers", "open-orders"],
    queryFn: adminApi.listSuspendedOpenOrders,
    retry: false,
  });

  const cancel = useMutation({
    mutationFn: () =>
      adminApi.bulkCancelSellerOrders(target!.sellerProfileId, {
        reason: reason.trim(),
        restock,
      }),
    onSuccess: async (result) => {
      setTarget(null);
      setReason("");
      await queryClient.invalidateQueries({
        queryKey: ["admin", "suspended-sellers", "open-orders"],
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.analytics({ days: 30 }) });
      toast.success(t("cancelled", { count: result.cancelledCount }));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (list.isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (list.isError) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const sellers = list.data ?? [];
  const withOrders = sellers.filter((seller) => seller.openOrderCount > 0);

  return (
    <div className="grid gap-4">
      {withOrders.length === 0 ? (
        <Card className="grid place-items-center gap-2 rounded-2xl border-dashed p-10 text-center">
          <Badge variant="secondary" className="rounded-full">
            {t("okBadge")}
          </Badge>
          <p className="font-medium">{t("allClear")}</p>
          <p className="text-sm text-muted-foreground">{t("allClearHint")}</p>
        </Card>
      ) : null}

      {withOrders.map((seller) => (
        <Card key={seller.sellerProfileId} className="rounded-2xl">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <CardTitle className="flex flex-wrap items-center gap-2">
                {seller.businessName}
                <Badge variant="destructive">{t("suspended")}</Badge>
                {seller.falseDeliveryFlags > 0 ? (
                  <Badge variant="outline">
                    {t("falseFlags", { count: seller.falseDeliveryFlags })}
                  </Badge>
                ) : null}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{seller.email}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setTarget(seller);
                setReason("");
                setRestock(true);
              }}
            >
              {t("cancelOpen", { count: seller.openOrderCount })}
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-secondary/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">{t("order")}</th>
                  <th className="px-3 py-2">{t("customer")}</th>
                  <th className="px-3 py-2">{t("status")}</th>
                  <th className="px-3 py-2">{t("placed")}</th>
                  <th className="px-3 py-2 text-right">{t("total")}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {seller.orders.map((order) => (
                  <tr key={order.id} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">{order.shopOrderNumber}</td>
                    <td className="px-3 py-2">
                      {order.order.contactName}
                      <span className="block text-xs text-muted-foreground">
                        {order.order.contactPhone}
                      </span>
                    </td>
                    <td className="px-3 py-2">{tStatus(order.status)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDateTime(order.order.placedAt, locale)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <Price value={order.total} locale={locale} size="sm" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-xs text-primary underline-offset-4 hover:underline"
                      >
                        {t("open")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogDescription>
              {t("confirmBody", {
                count: target?.openOrderCount ?? 0,
                name: target?.businessName ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="bulk-cancel-reason">{t("reason")}</Label>
              <Input
                id="bulk-cancel-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t("reasonPlaceholder")}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="bulk-cancel-restock" checked={restock} onCheckedChange={setRestock} />
              <Label htmlFor="bulk-cancel-restock">{t("restock")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setTarget(null)}>
              {t("keep")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancel.isPending || reason.trim().length < 3}
              onClick={() => cancel.mutate()}
            >
              {cancel.isPending ? t("cancelling") : t("confirmCancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
