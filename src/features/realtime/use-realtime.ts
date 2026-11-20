"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";

import { useAuth } from "@/features/auth/auth-provider";
import { apiPost } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-keys";
import { broadcastAuth } from "@/lib/auth/broadcast";

const NAMESPACE = "/realtime";
const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const HIDDEN_DISCONNECT_MS = 2 * 60_000;

interface RealtimeTicket {
  ticket: string;
  expiresInSeconds: number;
  url: string;
}

interface UnreadCountPayload {
  count?: number;
}

/**
 * Ticket-authenticated Socket.IO connection to the backend `/realtime` namespace
 * (see backend/docs/api/realtime.md). Mounted once app-wide; connection is managed
 * manually because the ticket is one-time and short-lived (re-fetch on every
 * reconnect). No-ops when `NEXT_PUBLIC_REALTIME_URL` is unset or the user is
 * anonymous. The unread-count polling fallback stays active in parallel.
 */
export function useRealtime(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const disposedRef = useRef(false);

  const userId = user?.id ?? null;

  useEffect(() => {
    const configuredUrl = process.env.NEXT_PUBLIC_REALTIME_URL?.trim();
    if (!configuredUrl || !userId) {
      return;
    }

    disposedRef.current = false;

    const clearReconnect = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const teardown = () => {
      clearReconnect();
      const socket = socketRef.current;
      socketRef.current = null;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    };

    const invalidateNotifications = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnreadCount });
    };

    const onSessionRevoked = () => {
      // The refresh session is gone (password change, logout everywhere,
      // suspension or an admin revoke). Keep the page and its data; the
      // session-expired dialog offers an inline login instead of a redirect.
      broadcastAuth("session:expired");
      teardown();
    };

    const scheduleReconnect = () => {
      if (disposedRef.current) {
        return;
      }
      clearReconnect();
      const attempt = attemptRef.current;
      attemptRef.current += 1;
      const backoff = Math.min(MAX_BACKOFF_MS, MIN_BACKOFF_MS * 2 ** attempt);
      const jitter = Math.random() * backoff * 0.3;
      reconnectTimerRef.current = setTimeout(() => {
        void connect();
      }, backoff + jitter);
    };

    const connect = async (): Promise<void> => {
      if (disposedRef.current || socketRef.current) {
        return;
      }

      let ticket: RealtimeTicket;
      try {
        const result = await apiPost<RealtimeTicket>("/realtime/ticket");
        ticket = result.data;
      } catch {
        scheduleReconnect();
        return;
      }

      if (disposedRef.current || !ticket?.ticket) {
        return;
      }

      const baseUrl = ticket.url?.trim() || configuredUrl;
      // Lazy chunk: socket.io is only downloaded for authenticated sessions.
      const { io } = await import("socket.io-client");
      const socket = io(`${baseUrl}${NAMESPACE}`, {
        transports: ["websocket"],
        auth: { ticket: ticket.ticket },
        reconnection: false,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        attemptRef.current = 0;
      });
      socket.on("notification:new", invalidateNotifications);
      socket.on("notification:unread_count", (payload: UnreadCountPayload) => {
        if (typeof payload?.count === "number") {
          queryClient.setQueryData(queryKeys.notificationsUnreadCount, payload.count);
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      });
      socket.on("notification:refresh", invalidateNotifications);
      socket.on("session:revoked", onSessionRevoked);
      socket.on("connect_error", () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }
        socket.disconnect();
        scheduleReconnect();
      });
      socket.on("disconnect", () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
          scheduleReconnect();
        }
      });
    };

    void connect();

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenTimerRef.current = setTimeout(() => {
          teardown();
        }, HIDDEN_DISCONNECT_MS);
      } else {
        if (hiddenTimerRef.current) {
          clearTimeout(hiddenTimerRef.current);
          hiddenTimerRef.current = null;
        }
        if (!socketRef.current && !reconnectTimerRef.current) {
          attemptRef.current = 0;
          void connect();
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposedRef.current = true;
      if (hiddenTimerRef.current) {
        clearTimeout(hiddenTimerRef.current);
        hiddenTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibility);
      teardown();
    };
  }, [userId, queryClient]);
}
