import Link from "next/link";
import { getTranslations } from "next-intl/server";

const LINKS = [
  { href: "/admin", key: "dashboard" },
  { href: "/admin/sellers", key: "sellers" },
  { href: "/admin/users", key: "users" },
  { href: "/admin/shops", key: "shops" },
  { href: "/admin/products", key: "products" },
  { href: "/admin/categories", key: "categories" },
  { href: "/admin/orders", key: "orders" },
  { href: "/admin/refunds", key: "refunds" },
  { href: "/admin/payouts", key: "payouts" },
  { href: "/admin/commission-rules", key: "commissionRules" },
  { href: "/admin/complaints", key: "complaints" },
  { href: "/admin/review-reports", key: "reviewReports" },
  { href: "/admin/banners", key: "banners" },
  { href: "/admin/homepage-sections", key: "homepageSections" },
  { href: "/admin/announcements", key: "announcements" },
  { href: "/admin/payments", key: "payments" },
  { href: "/admin/audit-logs", key: "auditLogs" },
  { href: "/admin/settings", key: "settings" },
] as const;

export async function AdminNav() {
  const t = await getTranslations("admin.nav");
  return (
    <nav aria-label={t("dashboard")} className="border-b border-border bg-card">
      <ul className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-2 py-2 text-sm sm:px-4">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex min-h-9 items-center rounded-full px-3 font-medium whitespace-nowrap text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(link.key)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
