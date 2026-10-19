"use client";

import {
  BarChart3,
  CreditCard,
  FileText,
  Flag,
  ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  MapPin,
  Megaphone,
  Menu,
  MessageCircleQuestion,
  MessageSquareWarning,
  Package,
  Percent,
  RotateCcw,
  Scale,
  ScrollText,
  Settings,
  ShoppingCart,
  Star,
  Store,
  Tags,
  Undo2,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { sellerApi } from "@/features/seller/api";
import { queryKeys } from "@/lib/api/query-keys";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "cn";
import { LinkPending } from "./link-pending";
import { LocaleSwitch } from "./locale-switch";
import { Logo } from "./logo";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";

type Role = "seller" | "admin";

interface NavItem {
  href: string;
  key: string;
  icon: LucideIcon;
  exact?: boolean;
}

const SELLER_NAV: NavItem[] = [
  { href: "/seller/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/seller/products", key: "products", icon: Package },
  { href: "/seller/orders", key: "orders", icon: ShoppingCart },
  { href: "/seller/cancellation-requests", key: "cancellations", icon: Undo2 },
  { href: "/seller/questions", key: "questions", icon: MessageCircleQuestion },
  { href: "/seller/reviews", key: "reviews", icon: Star },
  { href: "/seller/complaints", key: "complaints", icon: Flag },
  { href: "/seller/earnings", key: "earnings", icon: Wallet },
  { href: "/seller/analytics", key: "analytics", icon: BarChart3 },
  { href: "/seller/shop", key: "shop", icon: Store },
  { href: "/seller/delivery-zones", key: "zones", icon: MapPin },
  { href: "/seller/payout-accounts", key: "payouts", icon: CreditCard },
  { href: "/seller/apply", key: "apply", icon: FileText },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/sellers", key: "sellers", icon: Users },
  { href: "/admin/users", key: "users", icon: UsersRound },
  { href: "/admin/shops", key: "shops", icon: Store },
  { href: "/admin/products", key: "products", icon: Package },
  { href: "/admin/categories", key: "categories", icon: Tags },
  { href: "/admin/orders", key: "orders", icon: ShoppingCart },
  { href: "/admin/refunds", key: "refunds", icon: RotateCcw },
  { href: "/admin/payouts", key: "payouts", icon: Wallet },
  { href: "/admin/commission-rules", key: "commissionRules", icon: Percent },
  { href: "/admin/complaints", key: "complaints", icon: MessageSquareWarning },
  { href: "/admin/content-reports", key: "contentReports", icon: MessageCircleQuestion },
  { href: "/admin/review-reports", key: "reviewReports", icon: Flag },
  { href: "/admin/banners", key: "banners", icon: ImageIcon },
  { href: "/admin/homepage-sections", key: "homepageSections", icon: LayoutTemplate },
  { href: "/admin/announcements", key: "announcements", icon: Megaphone },
  { href: "/admin/payments", key: "payments", icon: CreditCard },
  { href: "/admin/reconciliation", key: "reconciliation", icon: Scale },
  { href: "/admin/audit-logs", key: "auditLogs", icon: ScrollText },
  { href: "/admin/settings", key: "settings", icon: Settings },
];

function DashboardNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const t = useTranslations(`${role}.nav`);
  const pathname = usePathname();
  const items = role === "admin" ? ADMIN_NAV : SELLER_NAV;

  const dashboard = useQuery({
    queryKey: queryKeys.seller.dashboard,
    queryFn: sellerApi.dashboard,
    enabled: role === "seller",
    retry: false,
  });
  const unanswered = role === "seller" ? (dashboard.data?.unansweredQuestions ?? 0) : 0;

  return (
    <nav className="grid gap-1" aria-label={t("dashboard")}>
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        const badge = item.key === "questions" && unanswered > 0 ? unanswered : null;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{t(item.key)}</span>
            {badge ? (
              <Badge variant="destructive" className="ms-auto rounded-full px-1.5 py-0 text-[10px]">
                {badge}
              </Badge>
            ) : null}
            <LinkPending className={cn("shrink-0", badge ? "" : "ms-auto")} />
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  role,
  children,
  banner,
}: {
  role: Role;
  children: ReactNode;
  banner?: ReactNode;
}) {
  const t = useTranslations("shell");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-1 bg-background">
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 overflow-y-auto bg-sidebar px-3 py-5 text-sidebar-foreground lg:flex">
        <div className="px-2">
          <Logo tone="sidebar" />
        </div>
        <DashboardNav role={role} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md">
          <div className="lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("openMenu")}
                onClick={() => setOpen(true)}
              >
                <Menu aria-hidden />
              </Button>
              <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground">
                <SheetHeader>
                  <SheetTitle className="text-sidebar-foreground">
                    <Logo tone="sidebar" />
                  </SheetTitle>
                </SheetHeader>
                <div className="px-2">
                  <DashboardNav role={role} onNavigate={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/">{t("storefront")}</Link>
          </Button>

          <div className="ml-auto flex items-center gap-1">
            <LocaleSwitch />
            <NotificationsBell />
            <UserMenu />
          </div>
        </header>

        {banner}
        <div id="main" className="flex flex-1 flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
