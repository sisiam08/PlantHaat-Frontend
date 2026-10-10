"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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
import { userStatusVariant } from "../status";
import { Pager } from "./pager";

const PAGE_SIZE = 20;
const ROLES = ["ALL", "CUSTOMER", "SELLER", "ADMIN"] as const;
const STATUSES = ["ALL", "ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;

export function UsersList({
  initialRole,
  initialStatus,
  initialPage,
}: {
  initialRole: string;
  initialStatus: string;
  initialPage: number;
}) {
  const t = useTranslations("admin.users");
  const tRole = useTranslations("admin.userRole");
  const tStatus = useTranslations("admin.userStatus");
  const tCommon = useTranslations("admin.common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const queryClient = useQueryClient();

  const role = (ROLES as readonly string[]).includes(initialRole) ? initialRole : "ALL";
  const status = (STATUSES as readonly string[]).includes(initialStatus) ? initialStatus : "ALL";
  const page = Math.max(1, initialPage);

  const query = useQuery({
    queryKey: queryKeys.admin.users({ role, status, page }),
    queryFn: () =>
      adminApi.listUsers({
        role: role === "ALL" ? undefined : role,
        status: status === "ALL" ? undefined : status,
        page,
        limit: PAGE_SIZE,
      }),
    retry: false,
  });

  const go = (nextRole: string, nextStatus: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextRole !== "ALL") params.set("role", nextRole);
    if (nextStatus !== "ALL") params.set("status", nextStatus);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    router.push(qs ? `/admin/users?${qs}` : "/admin/users");
  };

  const toggle = useMutation({
    mutationFn: ({ id, suspend }: { id: string; suspend: boolean }) =>
      suspend ? adminApi.suspendUser(id) : adminApi.reactivateUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      toast.success(t("updated"));
    },
    onError: (error) => toastApiError(error, tErrors),
  });

  const items = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1">
        {ROLES.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={role === value ? "secondary" : "ghost"}
            onClick={() => go(value, status, 1)}
          >
            {value === "ALL" ? tCommon("allRoles") : tRole(value)}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {STATUSES.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={status === value ? "secondary" : "ghost"}
            onClick={() => go(role, value, 1)}
          >
            {value === "ALL" ? tCommon("allStatuses") : tStatus(value)}
          </Button>
        ))}
      </div>

      {query.isLoading ? <Skeleton className="h-24 w-full rounded-2xl" /> : null}
      {query.isError ? <p className="text-sm text-muted-foreground">{t("loadError")}</p> : null}
      {!query.isLoading && !query.isError && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-3">
        {items.map((user) => (
          <Card key={user.id} className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">
                    {user.name}
                  </Link>
                  <Badge variant="outline">{tRole(user.role)}</Badge>
                  <Badge variant={userStatusVariant(user.status)}>{tStatus(user.status)}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {user.email} · {formatLatinDateTime(user.createdAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/users/${user.id}`}>{t("view")}</Link>
                </Button>
                {user.role !== "ADMIN" ? (
                  user.status === "SUSPENDED" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate({ id: user.id, suspend: false })}
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
                          toggle.mutate({ id: user.id, suspend: true });
                        }
                      }}
                    >
                      {t("suspend")}
                    </Button>
                  )
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {meta ? <Pager page={meta.page} totalPages={meta.totalPages} onPage={(p) => go(role, status, p)} /> : null}
    </div>
  );
}
