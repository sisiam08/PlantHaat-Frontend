import { Search, ShoppingCart, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * Compact 3-step strip: no visible heading (an sr-only h2 keeps it accessible
 * and SEO-friendly), minimal height, no tall cards.
 */
export async function HowItWorksStrip() {
  const t = await getTranslations("home");
  const steps = [
    { icon: Search, label: t("howStep1") },
    { icon: ShoppingCart, label: t("howStep2") },
    { icon: Truck, label: t("howStep3") },
  ];

  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3 md:px-6 md:py-3.5"
    >
      <h2 id="how-it-works-heading" className="sr-only">
        {t("howTitleSr")}
      </h2>
      <ol className="grid grid-cols-3 items-center gap-2">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-center justify-center gap-2 text-center">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              <step.icon aria-hidden className="size-4" />
            </span>
            <span className="text-xs leading-normal font-medium text-foreground sm:text-sm">
              {step.label}
            </span>
            {index < steps.length - 1 ? <span className="sr-only">·</span> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
