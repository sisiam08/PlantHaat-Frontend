import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeroComposition } from "@/features/catalog/components/hero-composition";
import type { CategoryNode } from "@/lib/api/types";

/**
 * Server-rendered hero. The headline/search/CTA exist in the first HTML payload;
 * only the decorative depth planes hydrate for parallax.
 */
export async function Hero({ categories }: { categories: CategoryNode[] }) {
  const t = await getTranslations("home");
  const ts = await getTranslations("search");
  const locale = await getLocale();

  const plates = categories
    .filter((category) => Boolean(category.imageUrl))
    .slice(0, 2)
    .map((category) => ({
      name: locale === "bn" && category.nameBn ? category.nameBn : category.name,
      imageUrl: category.imageUrl ?? null,
    }));

  return (
    <section className="hero-grain relative overflow-hidden rounded-[2rem] border border-border/60 bg-[radial-gradient(120%_120%_at_85%_10%,var(--secondary)_0%,var(--background)_46%,color-mix(in_oklab,var(--secondary)_55%,white)_100%)]">
      <div className="relative z-10 grid items-center gap-8 px-5 py-10 md:grid-cols-[1.1fr_0.9fr] md:gap-10 md:px-12 md:py-14">
        <div className="grid gap-5">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            {t("heroBadge")}
          </p>

          <h1 className="font-heading text-balance text-4xl font-bold text-foreground sm:text-5xl lg:text-6xl">
            {t("heroTitle")}
          </h1>

          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            {t("heroSubtitle")}
          </p>

          <form
            action="/products"
            method="get"
            role="search"
            className="flex w-full max-w-xl flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                name="q"
                aria-label={ts("label")}
                placeholder={ts("placeholder")}
                className="h-12 rounded-full border-input bg-card pl-11 text-base shadow-sm"
              />
            </div>
            <Button type="submit" variant="cta" size="lg" className="h-12 px-6">
              {ts("label")}
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link
              href="/shops"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              {t("heroCtaSecondary")}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
            <Link
              href="/products"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("heroCta")}
            </Link>
          </div>
        </div>

        <HeroComposition plates={plates} />
      </div>
    </section>
  );
}
