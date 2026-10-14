import type { Metadata } from "next";
import { getLocale, getMessages } from "next-intl/server";
import type { ReactNode } from "react";

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

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        {locale === "bn" ? (
          <link
            rel="preload"
            href="/fonts/hind-siliguri-bengali-400.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        ) : null}
        <link
          rel="preload"
          href="/fonts/inter-latin-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body suppressHydrationWarning className="flex min-h-full flex-col">
        <AppProviders locale={locale} messages={messages}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
