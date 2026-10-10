import type { Metadata } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";
import { clientEnv } from "@/env/client";
import "./globals.css";

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hind",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// The locale is resolved from a cookie for every request, so the app renders
// dynamically for now. Revisit per-route static shells / Suspense in F2.
export const instant = false;

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "PlantHaat",
    template: "%s · PlantHaat",
  },
  description: "Bangladesh's multi-vendor plant marketplace — verified nurseries, cash on delivery.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${hindSiliguri.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppProviders locale={locale} messages={messages}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
