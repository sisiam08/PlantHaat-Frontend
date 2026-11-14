import { BadgeCheck, Banknote, PackageCheck, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

/** Static trust row — no marquee, no animation. */
export async function TrustStrip() {
  const t = await getTranslations("home");
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
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
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
    </section>
  );
}
