import Link from "next/link";
import { getTranslations } from "next-intl/server";

const LINKS = [
  { href: "/seller/dashboard", key: "dashboard" },
  { href: "/seller/apply", key: "apply" },
  { href: "/seller/shop", key: "shop" },
  { href: "/seller/delivery-zones", key: "zones" },
  { href: "/seller/payout-accounts", key: "payouts" },
] as const;

export async function SellerNav() {
  const t = await getTranslations("seller.nav");
  return (
    <nav aria-label={t("dashboard")} className="border-b border-border bg-card">
      <ul className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-2 py-2 text-sm sm:px-4">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex min-h-9 items-center rounded-full px-3 font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(link.key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
