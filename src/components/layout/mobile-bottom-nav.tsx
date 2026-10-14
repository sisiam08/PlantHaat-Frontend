"use client";

import { Home, LayoutGrid, Package, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "cn";
import { LinkPending } from "./link-pending";

const ITEMS = [
  { key: "home", href: "/", icon: Home },
  { key: "categories", href: "/products", icon: LayoutGrid },
  { key: "cart", href: "/cart", icon: ShoppingBag },
  { key: "orders", href: "/orders", icon: Package },
  { key: "account", href: "/account", icon: User },
] as const;

export function MobileBottomNav() {
  const t = useTranslations("nav");
  const tc = useTranslations("shell");
  const pathname = usePathname();

  return (
    <nav
      aria-label={tc("bottomNavLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-7xl items-stretch justify-around px-2">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {t(item.key)}
                <LinkPending className="absolute top-1.5 right-3" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
