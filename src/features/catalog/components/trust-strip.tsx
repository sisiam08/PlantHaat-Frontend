import { BadgeCheck, Banknote, PackageCheck, ShieldCheck, Search, ShoppingCart, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";

/** Static trust row — no marquee, no animation. */
export async function TrustStrip() {
  const t = await getTranslations("home");
  const steps = [
    { icon: Search, label: t("howStep1") },
    { icon: ShoppingCart, label: t("howStep2") },
    { icon: Truck, label: t("howStep3") },
  ];
  const items = [
    { icon: BadgeCheck, label: t("trustVerified") },
    { icon: Banknote, label: t("trustCod") },
    { icon: PackageCheck, label: t("trustPackaging") },
    { icon: ShieldCheck, label: t("trustComplaint") },
  ];

  return (
    <section
      aria-label={t("trustVerified")}
      className="rounded-2xl border border-border/60 bg-secondary/50 px-4 py-3"
    >
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4 sm:text-sm">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label} className="flex items-center gap-2 text-secondary-foreground">
              <Icon aria-hidden className="size-4 shrink-0 text-primary" strokeWidth={1.75} />
              <span className="min-w-0 leading-snug">{item.label}</span>
            </li>
          );
        })}
      </ul>
      <ol className="mt-2 grid grid-cols-3 items-center gap-2 border-t border-border/60 pt-2 text-center text-[0.68rem] leading-snug font-medium text-secondary-foreground sm:text-xs">
        {steps.map((step) => (
          <li key={step.label} className="flex items-center justify-center gap-1.5">
            <step.icon aria-hidden className="size-3.5 shrink-0 text-primary" />
            <span className="line-clamp-2">{step.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

