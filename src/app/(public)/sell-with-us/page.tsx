import { ArrowRight, BadgeCheck, Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { PageLoading } from "@/components/layout/page-skeleton";
import { StaticPage } from "@/components/layout/static-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.sellWithUs");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default function SellWithUsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SellWithUsContent />
    </Suspense>
  );
}

async function SellWithUsContent() {
  const t = await getTranslations("static.sellWithUs");
  const benefits = t.raw("benefits") as { title: string; body: string }[];
  const steps = t.raw("steps") as string[];
  const requirements = t.raw("requirements") as string[];

  return (
    <StaticPage title={t("title")} lead={t("lead")}>
      <section className="grid gap-5">
        <h2 className="font-heading text-2xl font-semibold">{t("benefitsTitle")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="h-full rounded-2xl">
              <CardContent className="grid gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
                  <BadgeCheck aria-hidden className="size-5" />
                </span>
                <h3 className="font-heading text-lg font-semibold">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t("stepsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 text-sm">
              {steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t("requirementsTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm">
              {requirements.map((item) => (
                <li key={item} className="flex gap-3">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border/60 bg-gradient-to-br from-cta/25 to-secondary/50 px-6 py-10 md:flex-row md:items-center md:px-12">
        <div className="grid gap-2">
          <h2 className="font-heading text-2xl font-semibold">{t("ctaTitle")}</h2>
          <p className="max-w-xl text-muted-foreground">{t("ctaBody")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="cta" size="lg">
            <Link href="/register/seller">
              {t("ctaButton")} <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/how-it-works">{t("ctaSecondary")}</Link>
          </Button>
        </div>
      </section>
    </StaticPage>
  );
}
