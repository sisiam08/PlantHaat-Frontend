"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { queryKeys } from "@/lib/api/query-keys";
import type { PublicUser, Role } from "@/lib/api/types";
import { mergeGuestCart } from "@/features/cart/merge";
import { broadcastAuth, subscribeAuth } from "@/lib/auth/broadcast";
import { refreshOnceDetailed } from "@/lib/auth/refresh";
import { writeSessionHint } from "@/lib/auth/session-hint";
import {
  rememberAuthenticated,
  rememberExpired,
  rememberGuest,
} from "@/lib/auth/session-state";
import { authApi, type LoginInput, type RegisterInput, type RegisterSellerInput } from "./api";

const REFRESH_SKEW_MS = 60_000;
const REFRESH_REARM_MS = 10 * 60_000;
const LONG_IDLE_MS = 5 * 60_000;

export function roleHome(role: Role | undefined): string {
  if (role === "ADMIN") {
    return "/admin";
  }
  if (role === "SELLER") {
    return "/seller/dashboard";
  }
  return "/";
}

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  /** Non-sensitive layout hint from the last known session cookie. */
  hasSessionHint: boolean;
  login: (input: LoginInput) => Promise<PublicUser>;
  register: (input: RegisterInput) => Promise<PublicUser>;
  registerSeller: (input: RegisterSellerInput) => Promise<PublicUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialHasSession = false,
  children,
}: {
  initialHasSession?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenAtRef = useRef<number | null>(null);

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.me,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // While /auth/me loads, reserve chrome from the layout hint; afterwards the
  // resolved query is the only source of truth. No state mirroring is needed.
  const hasSessionHint = meQuery.isLoading ? initialHasSession : Boolean(meQuery.data);

  useEffect(() => {
    if (!meQuery.isLoading) writeSessionHint(Boolean(meQuery.data));
  }, [meQuery.data, meQuery.isLoading]);

  useEffect(() => {
    if (meQuery.data) rememberAuthenticated(meQuery.data.role);
  }, [meQuery.data]);

  const clearSession = useCallback(() => {
    setExpiresAt(null);
    writeSessionHint(false);
    rememberGuest();
    queryClient.clear();
    router.refresh();
  }, [queryClient, router]);

  const applySession = useCallback(
    (user: PublicUser, accessTokenExpiresAt: number) => {
      setExpiresAt(accessTokenExpiresAt);
      writeSessionHint(true);
      rememberAuthenticated(user.role);
      queryClient.setQueryData(queryKeys.auth.me, user);
    },
    [queryClient],
  );

  // Proactive refresh ~60s before the access token expires, then re-arm.
  useEffect(() => {
    if (!expiresAt) {
      return;
    }
    const delay = expiresAt - Date.now() - REFRESH_SKEW_MS;
    // Very short-lived test tokens should refresh on demand instead of
    // scheduling an immediate, duplicate rotation right after login.
    if (delay <= 0) {
      return;
    }
    timerRef.current = setTimeout(async () => {
      const outcome = await refreshOnceDetailed({ notify: false });
      if (outcome === "refreshed") {
        setExpiresAt(Date.now() + REFRESH_REARM_MS);
      }
    }, delay);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [expiresAt]);

  // Refresh on focus near expiry, or after a long idle in a hidden tab.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenFor = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
      if (!queryClient.getQueryData(queryKeys.auth.me)) {
        return;
      }
      if (
        hiddenFor >= LONG_IDLE_MS ||
        (expiresAt !== null && expiresAt - Date.now() <= REFRESH_SKEW_MS)
      ) {
        void refreshOnceDetailed({ notify: false });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [expiresAt, queryClient]);

  // Cross-tab sync (logout / session revoked / refresh / account switch).
  useEffect(() => {
    return subscribeAuth((message) => {
      if (message.type === "logout" || message.type === "session:revoked") {
        clearSession();
      } else if (message.type === "session:expired") {
        // Keep the session-expired handoff open, but show logged-out chrome.
        if (message.reason !== "required") {
          rememberExpired(message.role ?? meQuery.data?.role);
        }
        setExpiresAt(null);
        writeSessionHint(false);
        queryClient.setQueryData(queryKeys.auth.me, null);
      } else if (message.type === "refresh") {
        if (typeof message.expiresAt === "number") {
          setExpiresAt(message.expiresAt);
        }
        const current = queryClient.getQueryData<PublicUser>(queryKeys.auth.me);
        if (message.userId && current?.id !== message.userId) {
          // A different account (or a first login) happened in another tab.
          // Never keep the previous account's cached data.
          queryClient.clear();
          window.location.reload();
          return;
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      }
    });
  }, [clearSession, queryClient]);

  const onAuthenticated = useCallback(
    async (
      user: PublicUser,
      accessTokenExpiresAt: number,
      options: { refresh?: boolean } = {},
    ) => {
      // Merge before publishing the user: AuthEntryGuard redirects as soon as
      // the auth cache updates, and a checkout return must already see the
      // guest cart on the server.
      try {
        await mergeGuestCart();
      } catch {
        // Guest-cart merge is best-effort; a failure must not block login.
      }
      applySession(user, accessTokenExpiresAt);
      broadcastAuth("refresh", { expiresAt: accessTokenExpiresAt, userId: user.id });
      if (options.refresh !== false) router.refresh();
      return user;
    },
    [applySession, router],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const session = await authApi.login(input);
      return onAuthenticated(session.user, session.accessTokenExpiresAt);
    },
    [onAuthenticated],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const session = await authApi.register(input);
      return onAuthenticated(session.user, session.accessTokenExpiresAt);
    },
    [onAuthenticated],
  );

  const registerSeller = useCallback(
    async (input: RegisterSellerInput) => {
      const session = await authApi.registerSeller(input);
      // The seller form performs a full navigation to /seller/apply after the
      // session exists; a router.refresh here would let the proxy redirect the
      // auth-entry page to the seller home before onboarding is reachable.
      return onAuthenticated(session.user, session.accessTokenExpiresAt, { refresh: false });
    },
    [onAuthenticated],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      broadcastAuth("logout");
      clearSession();
    }
  }, [clearSession]);

  const logoutAll = useCallback(async () => {
    try {
      await authApi.logoutAll();
    } finally {
      broadcastAuth("logout");
      clearSession();
    }
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isLoading: meQuery.isLoading,
      hasSessionHint,
      login,
      register,
      registerSeller,
      logout,
      logoutAll,
      refreshUser,
    }),
    [
      meQuery.data,
      meQuery.isLoading,
      hasSessionHint,
      login,
      register,
      registerSeller,
      logout,
      logoutAll,
      refreshUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
