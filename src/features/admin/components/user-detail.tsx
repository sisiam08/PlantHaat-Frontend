"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toastApiError } from "@/features/auth/components/error-toast";
import { queryKeys } from "@/lib/api/query-keys";
import { formatLatinDateTime } from "@/lib/format/date";
import { adminApi } from "../api";
import { userStatusVariant } from "../status";

export function UserDetail({ id }: { id: string }) {
  const t = useTranslations("admin.users");
  const tRole = useTranslations("admin.userRole");
  const tStatus = useTranslations("admin.userStatus");
  const tErrors = useTranslations("errors");
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.admin.user(id),
    queryFn: () => adminApi.getUser(id),
    retry: false,
  });

  const toggle = useMutation({
    mutationFn: (suspend: boolean) =>
      suspend ? adminApi.suspendUser(id) : adminApi.reactivateUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.user(id) });
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  if (query.isLoading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (query.isError || !query.data) {
    return <p className="text-sm text-muted-foreground">{t("loadError")}</p>;
  }

  const user = query.data;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{tRole(user.role)}</Badge>
            <Badge variant={userStatusVariant(user.status)}>{tStatus(user.status)}</Badge>
          </div>
        </div>
        {user.role !== "ADMIN" ? (
          <div className="flex gap-2">
            {user.status === "SUSPENDED" ? (
              <Button
                type="button"
                variant="cta"
                size="sm"
                disabled={toggle.isPending}
                onClick={() => toggle.mutate(false)}
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
                  if (window.confirm(t("suspendConfirm"))) toggle.mutate(true);
                }}
              >
                {t("suspend")}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <Row label={t("phone")} value={user.phone ?? "-"} />
          <Row
            label={t("emailVerified")}
            value={user.emailVerifiedAt ? formatLatinDateTime(user.emailVerifiedAt) : "-"}
          />
          <Row
            label={t("lastLogin")}
            value={user.lastLoginAt ? formatLatinDateTime(user.lastLoginAt) : "-"}
          />
          <Row label={t("createdAt")} value={formatLatinDateTime(user.createdAt)} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("activity")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Count label={t("orders")} value={user._count.orders} />
          <Count label={t("addresses")} value={user._count.addresses} />
          <Count label={t("reviews")} value={user._count.reviews} />
          <Count label={t("complaints")} value={user._count.complaints} />
        </CardContent>
      </Card>

      {user.sellerProfile ? (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t("sellerProfile")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              {user.sellerProfile.businessName}{" "}
              <Badge variant="outline">{user.sellerProfile.status}</Badge>
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/sellers/${user.sellerProfile.id}`}>{t("viewSeller")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-bold">{value}</span>
    </div>
  );
}
