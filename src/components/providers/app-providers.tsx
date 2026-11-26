"use client";

import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { Suspense, type ReactNode } from "react";

import { RouteProgress } from "@/components/layout/route-progress";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/auth-provider";
import { SessionExpiredProvider } from "@/features/auth/session-expired-provider";
import { RealtimeBridge } from "@/features/realtime/realtime-bridge";
import { LocaleLang } from "./locale-lang";
import { MotionProvider } from "./motion-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

export function AppProviders({
  locale,
  messages,
  initialHasSession = false,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  initialHasSession?: boolean;
  children: ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      forcedTheme="light"
      disableTransitionOnChange
    >
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Dhaka">
        <LocaleLang locale={locale} />
        <MotionProvider>
          <QueryProvider>
            <AuthProvider initialHasSession={initialHasSession}>
              <SessionExpiredProvider>
                <RealtimeBridge />
                <TooltipProvider delayDuration={200}>
                  <Suspense fallback={null}>
                    <RouteProgress />
                  </Suspense>
                  {children}
                  <Toaster position="top-center" richColors />
                </TooltipProvider>
              </SessionExpiredProvider>
            </AuthProvider>
          </QueryProvider>
        </MotionProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
