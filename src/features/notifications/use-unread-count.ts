"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/api/query-keys";
import { notificationsApi } from "./api";

/**
 * Polling fallback for the unread count while the realtime socket is not in
 * use; the socket (when integrated) will update the same query key instead.
 */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: queryKeys.notificationsUnreadCount,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: enabled ? 60_000 : false,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}
