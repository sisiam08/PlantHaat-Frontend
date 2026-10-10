"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/api/query-keys";
import { notificationsApi } from "../api";
import { useUnreadCount } from "../use-unread-count";

export function NotificationsClient() {
  const t = useTranslations("notifications");
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: () => notificationsApi.list(),
  });
  const unread = useUnreadCount();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("unread", { count: unread.data ?? 0 })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={markAll.isPending || !list.data?.data.length}
          onClick={() => markAll.mutate()}
        >
          {t("markAllRead")}
        </Button>
      </div>

      {list.isLoading ? <Skeleton className="h-32 w-full" /> : null}
      {list.data?.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : null}

      <div className="grid gap-2">
        {list.data?.data.map((item) => {
          const isUnread = item.readAt === null;
          return (
            <Card key={item.id}>
              <CardContent className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  <span className={cn("text-sm", isUnread && "font-semibold")}>{item.title}</span>
                  <span className="text-sm text-muted-foreground">{item.body}</span>
                </div>
                {isUnread ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(item.id)}
                  >
                    {t("markRead")}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
