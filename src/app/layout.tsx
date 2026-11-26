import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getLocale, getMessages } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { preload } from "react-dom";

import { InputModality } from "@/components/layout/input-modality";
import { AppProviders } from "@/components/providers/app-providers";
import { clientEnv } from "@/env/client";
import { SESSION_HINT_COOKIE } from "@/lib/auth/session-hint";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "PlantHaat",
    template: "%s · PlantHaat",
  },
  description:
    "Bangladesh's multi-vendor plant marketplace — verified nurseries, cash on delivery.",
};

/**
 * Shown from the static shell while the cookie-localized subtree resolves.
 * Resolving locale/messages only needs cookies + a bundled JSON import (no
 * network), so this is a brief flash; each route's own `loading.tsx` then takes
 * over for data-dependent content.
 */
function ShellSkeleton() {
  return (
    <div aria-hidden className="min-h-dvh bg-background">
      <div className="border-b border-border/60 bg-background/95">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-3 sm:px-4">
          <span className="h-7 w-24 rounded-lg bg-muted/40" />
          <span className="mx-4 hidden h-10 max-w-md flex-1 rounded-full bg-muted/30 md:block" />
          <div className="ml-auto flex items-center gap-1">
            <span className="h-9 w-[68px] rounded-full bg-muted/40" />
            <span className="size-11 rounded-full bg-muted/40" />
            <span className="size-11 rounded-full bg-muted/40" />
            <span className="size-11 rounded-full bg-muted/40" />
          </div>
        </div>
      </div>
      <div className="flex min-h-[70dvh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    </div>
  );
}

/**
 * Resolves the request locale/messages from the NEXT_LOCALE cookie. This reads
 * runtime data, so it must live inside a `<Suspense>` boundary (Cache
 * Components) or it would block the static shell for every route.
 */
async function LocalizedApp({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const hasSessionHint = (await cookies()).get(SESSION_HINT_COOKIE)?.value === "1";
  preload(
    locale === "bn" ? "/fonts/hind-siliguri-bengali-600.woff2" : "/fonts/inter-latin-var.woff2",
    {
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    },
  );
  return (
    <div lang={locale} className="contents">
      <AppProviders locale={locale} messages={messages} initialHasSession={hasSessionHint}>
        {children}
      </AppProviders>
    </div>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="bn"
      translate="no"
      data-scroll-behavior="smooth"
      className="h-full antialiased notranslate"
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <InputModality />
        <Suspense fallback={<ShellSkeleton />}>
          <LocalizedApp>{children}</LocalizedApp>
        </Suspense>
      </body>
    </html>
  );
}
