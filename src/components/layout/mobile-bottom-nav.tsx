"use client";

import { Home, LayoutGrid, Package, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { cn } from "cn";
import { useAuth } from "@/features/auth/auth-provider";
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
  const { user, hasSessionHint } = useAuth();
  const [hasFlowBar, setHasFlowBar] = useState(false);

  // A page flow bar and the floating nav never coexist.
  useEffect(() => {
    const check = () => setHasFlowBar(Boolean(document.querySelector("[data-flowbar]")));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-flowbar"],
    });
    return () => observer.disconnect();
  }, []);

  if (pathname.startsWith("/checkout") || hasFlowBar) {
    return null;
  }

  const showAccount = Boolean(user) || hasSessionHint;
  const items = showAccount ? ITEMS : ITEMS.filter((item) => item.key !== "account");

  return (
    <nav
      aria-label={tc("bottomNavLabel")}
      style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      className="fixed inset-x-3 z-40 rounded-full border border-border/70 bg-background/95 shadow-[0_12px_32px_-12px_rgb(11_33_22_/_0.35)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-7xl items-stretch justify-around px-1.5">
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full px-2 text-[0.7rem] font-medium transition-colors",
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
