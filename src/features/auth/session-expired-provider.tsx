"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { hasExpiredMarker } from "@/lib/auth/session-state";

export type AuthPromptMode = "expired" | "required";

interface SessionExpiredOptions {
  canDismiss?: boolean;
  mode?: AuthPromptMode;
  returnTo?: string;
  source?: "action" | "server";
}

interface SessionExpiredState extends SessionExpiredOptions {
  mode: AuthPromptMode;
  returnTo: string;
}

interface SessionExpiredContextValue {
  show: (options?: SessionExpiredOptions) => void;
  showCheckoutPrompt: () => void;
  dismiss: () => void;
}

const SessionExpiredContext = createContext<SessionExpiredContextValue | null>(null);

function currentPath(): string {
  if (typeof window === "undefined") return "/";
  const path = `${window.location.pathname}${window.location.search}`;
  // Returning to the handoff/auth pages would loop the dialog; fall back home.
  if (
    path === "/session-expired" ||
    path.startsWith("/login") ||
    path.startsWith("/register")
  ) {
    return "/";
  }
  return path;
}

/**
 * Owns the authentication prompt. "Expired" is for a session that really
 * existed; "required" is for a guest who asked for an authenticated action.
 * Detection and refresh stay in the API/auth layers; this component only
 * coordinates one prompt per tab and hands off to the existing login page.
 */
export function SessionExpiredProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("auth");
  const pathname = usePathname();
  const [state, setState] = useState<SessionExpiredState | null>(null);
  // A public visitor who dismisses a prompt should not be interrupted by the
  // next identical 401 burst; a different prompt (e.g. checkout after a guest
  // warning) can still open. A server-rendered page may always re-open it.
  const suppressedModeRef = useRef<AuthPromptMode | null>(null);

  const dismiss = useCallback(() => setState(null), []);

  const closeManually = useCallback(() => {
    suppressedModeRef.current = state?.mode ?? null;
    setState(null);
  }, [state?.mode]);

  const show = useCallback((options: SessionExpiredOptions = {}) => {
    const mode = options.mode ?? "expired";
    if (options.source !== "server" && suppressedModeRef.current === mode) return;
    suppressedModeRef.current = null;
    const path = options.returnTo ?? currentPath();
    setState((current) =>
      current ?? {
        canDismiss: options.canDismiss ?? !isProtectedPath(path),
        mode,
        returnTo: path,
        source: options.source ?? "action",
      },
    );
  }, []);

  const showCheckoutPrompt = useCallback(() => {
    suppressedModeRef.current = null;
    show({
      canDismiss: true,
      mode: hasExpiredMarker() ? "expired" : "required",
      returnTo: "/checkout",
      source: "action",
    });
  }, [show]);

  // Back/forward can move the prompt to a public page; there it can be closed.
  const canDismiss = state ? state.canDismiss || !isProtectedPath(pathname) : false;

  useEffect(() => {
    return subscribeAuth((message) => {
      if (message.type === "session:expired") {
        show({
          mode: message.reason === "required" ? "required" : "expired",
          source: "action",
        });
      } else if (
        message.type === "refresh" ||
        message.type === "logout" ||
        message.type === "session:revoked"
      ) {
        suppressedModeRef.current = null;
        dismiss();
      }
    });
  }, [dismiss, show]);

  const value = useMemo<SessionExpiredContextValue>(
    () => ({ show, showCheckoutPrompt, dismiss }),
    [show, showCheckoutPrompt, dismiss],
  );

  const required = state?.mode === "required";
  const checkout = Boolean(state?.returnTo.startsWith("/checkout"));
  const title = required
    ? t("loginRequiredTitle")
    : checkout
      ? t("sessionDialogCheckoutTitle")
      : t("sessionDialogTitle");
  const body = required
    ? checkout
      ? t("loginRequiredCheckoutBody")
      : t("loginRequiredBody")
    : checkout
      ? t("sessionDialogCheckoutBody")
      : t("sessionDialogBody");
  const loginHref = `/login?returnTo=${encodeURIComponent(
    state?.returnTo ?? "/",
  )}&reason=${required ? "auth-required" : "session-expired"}`;

  return (
    <SessionExpiredContext.Provider value={value}>
      {children}
      <Dialog
        open={state !== null}
        onOpenChange={(open) => {
          if (!open) {
            if (canDismiss) closeManually();
          }
        }}
      >
        <DialogContent
          showCloseButton={canDismiss}
          data-session-expired-dialog
          data-auth-prompt={state?.mode}
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
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{body}</DialogDescription>
          </DialogHeader>
          <Button asChild variant="cta" size="lg" className="w-full sm:w-auto">
            <Link href={loginHref} data-session-login-page onClick={dismiss}>
              {required ? t("logIn") : t("sessionLoginAgain")}
            </Link>
          </Button>
          <DialogFooter className="sm:justify-start">
            <Button asChild variant="outline" size="sm">
              <Link href="/" onClick={dismiss}>
                {t("sessionGoHome")}
              </Link>
            </Button>
            {canDismiss ? (
              <Button type="button" variant="ghost" size="sm" onClick={closeManually}>
                {t("sessionDismiss")}
              </Button>
            ) : null}
          </DialogFooter>
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
