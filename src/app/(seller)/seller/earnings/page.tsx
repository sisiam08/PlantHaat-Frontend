import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { WalletClient } from "@/features/seller/components/wallet-client";
import { getPublicSettings } from "@/server/public-settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("part4.wallet");
  return { title: t("title"), robots: { index: false } };
}

export default async function SellerEarningsPage() {
  const t = await getTranslations("part4.wallet");
  const settings = await getPublicSettings();
  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <WalletClient windowHours={settings["return.windowHours"]} />
    </main>
  );
}
