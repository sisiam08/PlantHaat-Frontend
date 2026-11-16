"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { sanitizeReturnTo } from "@/lib/navigation";
import { roleHome, useAuth } from "../auth-provider";

/** Covers bfcache/Back restores that skip the server-rendered redirect. */
export function AuthEntryGuard({ next }: { next?: string | null }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const redirect = () => {
      if (user) router.replace(sanitizeReturnTo(next) ?? roleHome(user.role));
    };
    redirect();
    window.addEventListener("pageshow", redirect);
    return () => window.removeEventListener("pageshow", redirect);
  }, [isLoading, next, router, user]);

  return null;
}
