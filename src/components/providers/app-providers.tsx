"use client";

import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { Suspense, type ReactNode } from "react";

import { RouteProgress } from "@/components/layout/route-progress";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/auth-provider";
import { RealtimeBridge } from "@/features/realtime/realtime-bridge";
import { MotionProvider } from "./motion-provider";
import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

export function AppProviders({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      forcedTheme="light"
      disableTransitionOnChange
    >
      <NextIntlClientProvider locale={locale} messages={messages}>
        <MotionProvider>
          <QueryProvider>
            <AuthProvider>
              <RealtimeBridge />
              <TooltipProvider delayDuration={200}>
                <Suspense fallback={null}>
                  <RouteProgress />
                </Suspense>
                {children}
                <Toaster position="top-center" richColors />
              </TooltipProvider>
            </AuthProvider>
          </QueryProvider>
        </MotionProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
