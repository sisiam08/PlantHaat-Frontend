"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QueryError } from "@/components/feedback/query-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { queryKeys } from "@/lib/api/query-keys";
import { sellerApi } from "../api";
import type { SellerStatus } from "../types";

const STATUS_VARIANT: Record<SellerStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  SUSPENDED: "destructive",
};

export function DashboardClient() {
  const t = useTranslations("seller.dashboard");
  const tStatus = useTranslations("seller.status");
  const tc = useTranslations("common");
  const { user } = useAuth();

  const application = useQuery({
    queryKey: queryKeys.seller.application,
    queryFn: sellerApi.getApplication,
    retry: false,
  });

  const status: SellerStatus | undefined =
    application.data?.status ?? user?.sellerStatus ?? undefined;
  const approved = status === "APPROVED";

  const dashboard = useQuery({
    queryKey: queryKeys.seller.dashboard,
    queryFn: sellerApi.dashboard,
    enabled: approved,
    retry: false,
  });
  const shop = useQuery({
    queryKey: queryKeys.seller.shop,
    queryFn: sellerApi.getShop,
    enabled: approved,
    retry: false,
  });

  if (application.isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (application.isError) {
    return (
      <QueryError
        message={tc("sectionLoadFailed")}
        onRetry={() => void application.refetch()}
      />
    );
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("applicationStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-2">
            {status ? <Badge variant={STATUS_VARIANT[status]}>{tStatus(status)}</Badge> : null}
          </div>
          {status === "PENDING" ? (
            <p className="text-sm text-muted-foreground">{t("pendingNotice")}</p>
          ) : null}
          {status === "REJECTED" ? (
            <p className="text-sm text-destructive">
              {t("rejectedNotice")}
              {application.data?.rejectionReason
                ? ` — ${t("rejectionReason", { reason: application.data.rejectionReason })}`
                : ""}
            </p>
          ) : null}
          {status === "SUSPENDED" ? (
            <p className="text-sm text-destructive">{t("suspendedNotice")}</p>
          ) : null}
          {!approved ? (
            <div>
              <Button asChild variant="cta">
                <Link href="/seller/apply">{t("completeApplication")}</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {approved ? (
        <>
          {dashboard.isError ? (
            <QueryError
              message={tc("sectionLoadFailed")}
              onRetry={() => void dashboard.refetch()}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Stat
                href="/seller/orders"
                label={t("pendingOrders")}
                value={dashboard.data?.pendingOrders}
                loading={dashboard.isLoading}
              />
              <Stat
                href="/seller/questions"
                label={t("unansweredQuestions")}
                value={dashboard.data?.unansweredQuestions}
                loading={dashboard.isLoading}
              />
              <Stat
                href="/seller/notifications"
                label={t("unreadNotifications")}
                value={dashboard.data?.unreadNotifications}
                loading={dashboard.isLoading}
              />
              <Stat
                href="/seller/products"
                label={t("lowStock")}
                value={dashboard.data?.lowStockVariants}
                loading={dashboard.isLoading}
              />
              <Stat
                href="/seller/orders"
                label={t("stuckOrders")}
                value={dashboard.data?.stuckOrders}
                loading={dashboard.isLoading}
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("shopSummary")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              {shop.isLoading ? <Skeleton className="h-12 w-full" /> : null}
              {shop.data ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{shop.data.name}</span>
                    <Badge variant="outline">{shop.data.slug}</Badge>
                    {shop.data.isOnVacation ? (
                      <Badge variant="secondary">{t("onVacation")}</Badge>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground">
                    {t("shopName")}: {shop.data.name}
                  </span>
                  <div>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/seller/shop">{t("viewShop")}</Link>
                    </Button>
                  </div>
                </>
              ) : null}
              {shop.isError ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-muted-foreground">{t("noShop")}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void shop.refetch()}
                  >
                    {tc("retry")}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("quickLinks")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/seller/shop">{t("manageShop")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/seller/delivery-zones">{t("manageZones")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/seller/payout-accounts">{t("managePayouts")}</Link>
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  loading,
  href,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  href?: string;
}) {
  const card = (
    <Card className="h-full transition-colors hover:border-primary/40">
      <CardContent className="grid gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <span className="font-heading text-2xl font-semibold tabular-nums">{value ?? 0}</span>
        )}
      </CardContent>
    </Card>
  );
  if (!href) return card;
  return (
    <Link href={href} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {card}
    </Link>
  );
}
