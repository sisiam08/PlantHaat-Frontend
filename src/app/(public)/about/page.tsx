import { ArrowRight, Leaf, ShieldCheck, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageLoading } from "@/components/layout/page-skeleton";
import { StaticPage } from "@/components/layout/static-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const VALUE_ICONS = [ShieldCheck, Leaf, Sprout] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.about");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function AboutPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AboutContent />
    </Suspense>
  );
}

async function AboutContent() {
  const t = await getTranslations("static.about");
  const values = t.raw("values") as { title: string; body: string }[];

  return (
    <StaticPage title={t("title")} lead={t("lead")}>
      <section className="grid gap-4 rounded-3xl border border-border/60 bg-secondary/40 px-6 py-10 md:px-12">
        <h2 className="font-heading text-2xl font-semibold">{t("missionTitle")}</h2>
        <p className="max-w-3xl text-muted-foreground">{t("missionBody")}</p>
      </section>

      <section className="grid gap-5">
        <h2 className="font-heading text-2xl font-semibold">{t("valuesTitle")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {values.map((value, index) => {
            const Icon = VALUE_ICONS[index % VALUE_ICONS.length];
            return (
              <Card key={value.title} className="rounded-2xl">
                <CardContent className="grid gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="font-heading text-lg font-semibold">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.body}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-2 rounded-3xl border border-border/60 bg-secondary/30 px-6 py-10 md:px-12">
        <h2 className="font-heading text-2xl font-semibold">{t("trustTitle")}</h2>
        <p className="max-w-3xl text-muted-foreground">{t("trustBody")}</p>
      </section>

      <section className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border/60 bg-linear-to-br from-cta/25 to-secondary/50 px-6 py-10 md:flex-row md:items-center md:px-12">
        <div className="grid gap-2">
          <h2 className="font-heading text-2xl font-semibold">{t("ctaTitle")}</h2>
          <p className="max-w-xl text-muted-foreground">{t("ctaBody")}</p>
        </div>
        <Button asChild variant="cta" size="lg">
          <Link href="/products">
            {t("ctaButton")} <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </section>
    </StaticPage>
  );
}
