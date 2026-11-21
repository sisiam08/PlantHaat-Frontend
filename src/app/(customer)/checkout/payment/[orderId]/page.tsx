import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { DevRibbon } from "@/components/layout/dev-ribbon";
import { PageLoading } from "@/components/layout/page-skeleton";
import { PaymentPage } from "@/features/payments/components/payment-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("payments");
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const dev = await getTranslations("dev");
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <>
      <DevRibbon />
      {isDev ? (
        <p
          role="alert"
          data-test-environment
          className="mx-auto mt-4 w-fit rounded-full border border-cta/40 bg-cta/15 px-4 py-1.5 text-center text-xs font-medium text-foreground"
        >
          {dev("label")}: {dev("body")}
        </p>
      ) : null}
      <Suspense fallback={<PageLoading />}>
        <PaymentPage orderId={orderId} />
      </Suspense>
    </>
  );
}
