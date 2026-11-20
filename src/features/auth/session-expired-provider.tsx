"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { subscribeAuth } from "@/lib/auth/broadcast";
import { isProtectedPath } from "@/lib/auth/paths";
import type { PublicUser } from "@/lib/api/types";
import { useAuth } from "./auth-provider";
import { SessionLoginForm } from "./components/session-login-form";

interface SessionExpiredOptions {
  canDismiss?: boolean;
  source?: "action" | "server";
}

interface SessionExpiredState extends SessionExpiredOptions {
  expiredUserId?: string;
  returnTo: string;
}

interface SessionExpiredContextValue {
  show: (options?: SessionExpiredOptions) => void;
  dismiss: () => void;
}

const SessionExpiredContext = createContext<SessionExpiredContextValue | null>(null);

function currentPath(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

/**
 * Owns the session-expired dialog. A refresh failure on an action opens it on
 * the current page; a dead-session protected navigation opens it on the
 * server-rendered session-expired page. Login happens inline, so the page,
 * form state, cart and scroll are kept. Other tabs learn about the login over
 * BroadcastChannel.
 */
export function SessionExpiredProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("auth");
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userRef = useRef<PublicUser | null>(user);
  const [state, setState] = useState<SessionExpiredState | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const dismiss = useCallback(() => setState(null), []);

  const show = useCallback((options: SessionExpiredOptions = {}) => {
    const path = currentPath();
    setState((current) =>
      current ?? {
        canDismiss: options.canDismiss ?? !isProtectedPath(path),
        source: options.source ?? "action",
        expiredUserId: userRef.current?.id,
        returnTo: path,
      },
    );
  }, []);

  // Back/forward can move the dialog to a public page; there it can be closed.
  // Derived rather than stored so no state update is needed on navigation.
  const canDismiss = state ? state.canDismiss || !isProtectedPath(pathname) : false;

  useEffect(() => {
    return subscribeAuth((message) => {
      if (message.type === "session:expired") {
        show({ source: "action" });
      } else if (
        message.type === "refresh" ||
        message.type === "logout" ||
        message.type === "session:revoked"
      ) {
        dismiss();
      }
    });
  }, [dismiss, show]);

  const complete = useCallback(
    async (nextUser: PublicUser) => {
      const source = state?.source;
      const expiredUserId = state?.expiredUserId;
      dismiss();
      if (source === "server") {
        window.location.reload();
        return;
      }
      if (expiredUserId && nextUser.id !== expiredUserId) {
        queryClient.clear();
        window.location.reload();
        return;
      }
      await queryClient.invalidateQueries();
      router.refresh();
      toast.success(t("sessionBackAgain"));
    },
    [dismiss, queryClient, router, state?.expiredUserId, state?.source, t],
  );

  const value = useMemo<SessionExpiredContextValue>(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <SessionExpiredContext.Provider value={value}>
      {children}
      <Dialog
        open={state !== null}
        onOpenChange={(open) => {
          if (!open && canDismiss) dismiss();
        }}
      >
        <DialogContent
          showCloseButton={canDismiss}
          data-session-expired-dialog
          onEscapeKeyDown={(event) => {
            if (!canDismiss) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (!canDismiss) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (!canDismiss) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("sessionDialogTitle")}</DialogTitle>
            <DialogDescription>{t("sessionDialogBody")}</DialogDescription>
          </DialogHeader>
          <SessionLoginForm onSuccess={complete} />
          <DialogFooter className="sm:justify-start">
            <Button asChild variant="outline" size="sm">
              <Link href="/" onClick={dismiss}>
                {t("sessionGoHome")}
              </Link>
            </Button>
            {canDismiss ? (
              <Button type="button" variant="ghost" size="sm" onClick={dismiss}>
                {t("sessionDismiss")}
              </Button>
            ) : null}
          </DialogFooter>
          <Link
            href={`/login?returnTo=${encodeURIComponent(state?.returnTo ?? "/")}&reason=session-expired`}
            data-session-login-page
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            onClick={dismiss}
          >
            {t("sessionLoginPage")}
          </Link>
        </DialogContent>
      </Dialog>
    </SessionExpiredContext.Provider>
  );
}

export function useSessionExpired(): SessionExpiredContextValue {
  const context = useContext(SessionExpiredContext);
  if (!context) {
    throw new Error("useSessionExpired must be used within a SessionExpiredProvider");
  }
  return context;
}
