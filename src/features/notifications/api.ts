import { apiGet, apiPatch, apiPost } from "@/lib/api/client";
import type { PaginationMeta } from "@/lib/api/common";
import type { NotificationItem } from "@/lib/api/types";

export const notificationsApi = {
  list: (params?: { unread?: boolean; page?: number; limit?: number }) =>
    apiGet<NotificationItem[]>("/notifications", { params }).then((result) => ({
      data: result.data,
      meta: result.meta as PaginationMeta | undefined,
    })),
  unreadCount: () =>
    apiGet<{ count: number }>("/notifications/unread-count").then((result) => result.data.count),
  markRead: (id: string) =>
    apiPatch<{ read: boolean }>(`/notifications/${encodeURIComponent(id)}/read`, {}).then(
      () => undefined,
    ),
  markAllRead: () =>
    apiPost<{ updated: number }>("/notifications/read-all", {}).then(() => undefined),
};
