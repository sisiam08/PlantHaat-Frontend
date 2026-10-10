"use client";

import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/auth-provider";
import { QueryProvider } from "./query-provider";

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
    <NextIntlClientProvider locale={locale} messages={messages}>
      <QueryProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster position="top-center" richColors />
          </TooltipProvider>
        </AuthProvider>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
