"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { EmptyState } from "@/components/feedback/empty-state";
import { QueryError } from "@/components/feedback/query-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/api/query-keys";
import { formatDateTime } from "@/lib/format/date";
import { useAuth } from "../auth-provider";
import { authApi, type SessionItem } from "../api";
import { toastApiError } from "./error-toast";

export function SessionsList() {
  const t = useTranslations("auth.sessions");
  const tErrors = useTranslations("errors");
  const locale = useLocale();
  const { logoutAll } = useAuth();

  const sessionsQuery = useQuery({
    queryKey: queryKeys.auth.sessions,
    queryFn: authApi.sessions,
    retry: false,
  });

  const handleRevoke = async (session: SessionItem) => {
    try {
      await authApi.revokeSession(session.id);
      await sessionsQuery.refetch();
      toast.success(t("revoke"));
    } catch (error) {
      toastApiError(error, tErrors);
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAll();
    } catch (error) {
      toastApiError(error, tErrors);
    }
  };

  if (sessionsQuery.isLoading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  if (sessionsQuery.isError) {
    return <QueryError message={tErrors("generic")} onRetry={() => void sessionsQuery.refetch()} />;
  }

  const sessions = sessionsQuery.data ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => void handleLogoutAll()}>
          {t("logoutAll")}
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="grid gap-3">
          {sessions.map((session) => (
            <Card key={session.id} className="rounded-2xl">
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {session.userAgent ?? "—"}
                    {session.isCurrent ? (
                      <Badge className="ml-2" variant="secondary">
                        {t("current")}
                      </Badge>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.ipAddress ?? "—"} · {t("lastUsed")}:{" "}
                    {formatDateTime(session.lastUsedAt, locale)}
                  </p>
                </div>
                {!session.isCurrent ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleRevoke(session)}
                  >
                    {t("revoke")}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
