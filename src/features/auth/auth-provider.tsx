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
import { refreshOnce } from "@/lib/auth/refresh";
import { authApi, type LoginInput, type RegisterInput, type RegisterSellerInput } from "./api";

const REFRESH_SKEW_MS = 60_000;

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
  login: (input: LoginInput) => Promise<PublicUser>;
  register: (input: RegisterInput) => Promise<PublicUser>;
  registerSeller: (input: RegisterSellerInput) => Promise<PublicUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authApi.me,
    retry: false,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const clearSession = useCallback(() => {
    setExpiresAt(null);
    queryClient.clear();
    router.refresh();
  }, [queryClient, router]);

  const applySession = useCallback(
    (user: PublicUser, accessTokenExpiresAt: number) => {
      setExpiresAt(accessTokenExpiresAt);
      queryClient.setQueryData(queryKeys.auth.me, user);
    },
    [queryClient],
  );

  // Proactive refresh ~60s before the access token expires.
  useEffect(() => {
    if (!expiresAt) {
      return;
    }
    const delay = Math.max(0, expiresAt - Date.now() - REFRESH_SKEW_MS);
    timerRef.current = setTimeout(() => {
      void refreshOnce();
    }, delay);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [expiresAt]);

  // Refresh on focus when the token is known to be near expiry.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      if (expiresAt && expiresAt - Date.now() <= REFRESH_SKEW_MS) {
        void refreshOnce();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [expiresAt]);

  // Cross-tab sync (logout / session revoked / refresh).
  useEffect(() => {
    return subscribeAuth((message) => {
      if (message.type === "logout" || message.type === "session:revoked") {
        clearSession();
      } else if (message.type === "refresh") {
        void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      }
    });
  }, [clearSession, queryClient]);

  const onAuthenticated = useCallback(
    async (user: PublicUser, accessTokenExpiresAt: number) => {
      applySession(user, accessTokenExpiresAt);
      try {
        await mergeGuestCart();
      } catch {
        // Guest-cart merge is best-effort; a failure must not block login.
      }
      broadcastAuth("refresh");
      router.refresh();
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
      return onAuthenticated(session.user, session.accessTokenExpiresAt);
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
