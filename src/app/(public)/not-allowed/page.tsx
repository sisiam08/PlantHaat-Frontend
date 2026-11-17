import { ShieldOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageLoading } from "@/components/layout/page-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { requireSession } from "@/server/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("errors");
  return { title: t("FORBIDDEN_ROLE"), robots: { index: false } };
}

export default function NotAllowedPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NotAllowedContent />
    </Suspense>
  );
}

async function NotAllowedContent() {
  await requireSession();
  const t = await getTranslations("errors");
  const nav = await getTranslations("nav");
  return (
    <div className="mx-auto grid w-full max-w-xl place-items-center px-4 py-16">
      <PageHeader title={t("FORBIDDEN_ROLE")} className="sr-only" />
      <EmptyState
        icon={ShieldOff}
        title={t("FORBIDDEN_ROLE")}
        action={
          <Button asChild variant="cta">
            <Link href="/">{nav("home")}</Link>
          </Button>
        }
      />
    </div>
  );
}
