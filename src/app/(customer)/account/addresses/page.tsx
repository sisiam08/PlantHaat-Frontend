import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { AddressesClient } from "@/features/account/components/addresses-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("account.addresses");
  return { title: t("title"), robots: { index: false } };
}

export default async function AddressesPage() {
  const t = await getTranslations("account.addresses");
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <AddressesClient />
    </main>
  );
}
