import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { StaticPage } from "@/components/layout/static-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("static.howItWorks");
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function HowItWorksPage() {
  const t = await getTranslations("static.howItWorks");
  const steps = t.raw("steps") as { title: string; body: string }[];
  const buyers = t.raw("buyers") as string[];
  const sellers = t.raw("sellers") as string[];
  const faqs = t.raw("faqs") as { q: string; a: string }[];

  return (
    <StaticPage title={t("title")} lead={t("lead")}>
      <section className="grid gap-5">
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full rounded-2xl">
                <CardContent className="grid gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-primary font-heading text-lg font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <h2 className="font-heading text-lg font-semibold">{step.title}</h2>
                  <p className="text-sm text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t("buyersTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              {buyers.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{t("sellersTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              {sellers.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-cta" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5">
        <h2 className="font-heading text-2xl font-semibold">{t("faqTitle")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.q} className="rounded-2xl">
              <CardContent className="grid gap-1">
                <h3 className="font-medium">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border/60 bg-gradient-to-br from-cta/25 to-secondary/50 px-6 py-10 md:flex-row md:items-center md:px-12">
        <h2 className="font-heading text-2xl font-semibold">{t("ctaTitle")}</h2>
        <Button asChild variant="cta" size="lg">
          <Link href="/products">
            {t("ctaButton")} <ArrowRight aria-hidden className="size-4" />
          </Link>
        </Button>
      </section>
    </StaticPage>
  );
}
