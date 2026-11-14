import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import { Suspense, type ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";
import { clientEnv } from "@/env/client";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "PlantHaat",
    template: "%s · PlantHaat",
  },
  description: "Bangladesh's multi-vendor plant marketplace — verified nurseries, cash on delivery.",
};

/**
 * Shown from the static shell while the cookie-localized subtree resolves.
 * Resolving locale/messages only needs cookies + a bundled JSON import (no
 * network), so this is a brief flash; each route's own `loading.tsx` then takes
 * over for data-dependent content.
 */
function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div
        aria-hidden
        className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary"
      />
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
  return (
    <div lang={locale} className="contents">
      <AppProviders locale={locale} messages={messages}>
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
        <link
          rel="preload"
          href="/fonts/hind-siliguri-bengali-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/inter-latin-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <Suspense fallback={<ShellSkeleton />}>
          <LocalizedApp>{children}</LocalizedApp>
        </Suspense>
      </body>
    </html>
  );
}
