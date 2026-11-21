import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageLoading } from "@/components/layout/page-skeleton";
import { StaticPage } from "@/components/layout/static-page";
import { Card, CardContent } from "@/components/ui/card";

const POLICY_SLUGS = ["terms", "privacy", "refund-cancellation", "delivery"] as const;
type PolicySlug = (typeof POLICY_SLUGS)[number];

const POLICY_KEYS: Record<PolicySlug, string> = {
  terms: "terms",
  privacy: "privacy",
  "refund-cancellation": "refundCancellation",
  delivery: "delivery",
};

function isPolicySlug(value: string): value is PolicySlug {
  return (POLICY_SLUGS as readonly string[]).includes(value);
}

export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isPolicySlug(slug)) {
    return {};
  }
  const t = await getTranslations("static.policies");
  return { title: t(`${POLICY_KEYS[slug]}.title`), description: t("metaDescription") };
}

export default function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <PolicyContent params={params} />
    </Suspense>
  );
}

async function PolicyContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isPolicySlug(slug)) {
    notFound();
  }
  const t = await getTranslations("static.policies");
  const key = POLICY_KEYS[slug];
  const intro = t(`${key}.intro`);
  const sections = t.raw(`${key}.sections`) as { title: string; body: string }[];

  return (
    <StaticPage title={t(`${key}.title`)} lead={intro} meta={t("updated")}>
      <p
        role="note"
        data-policy-draft
        className="max-w-3xl rounded-xl border border-cta/40 bg-cta/15 px-4 py-3 text-sm font-medium text-foreground"
      >
        {t("reviewNotice")}
      </p>
      <div className="grid max-w-3xl gap-4">
        {sections.map((section) => (
          <Card key={section.title} className="rounded-2xl">
            <CardContent className="grid gap-2">
              <h2 className="font-heading text-lg font-semibold">{section.title}</h2>
              <p className="text-sm text-muted-foreground">{section.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </StaticPage>
  );
}
