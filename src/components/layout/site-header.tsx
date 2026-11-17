"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { CartLink } from "./cart-link";
import { LocaleSwitch } from "./locale-switch";
import { Logo } from "./logo";
import { NotificationsBell } from "./notifications-bell";
import { MobileSearch, SearchBar } from "./search-bar";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  const t = useTranslations("shell");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  // Visual condense only — the height stays 64px so sticky offsets never jump.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const onStorefrontSearch = pathname === "/products";

  return (
    <header
      data-scrolled={scrolled ? "true" : "false"}
      className="sticky top-0 z-40 border-b border-border/60 bg-background/95 transition-shadow data-[scrolled=true]:shadow-[0_8px_24px_-24px_rgb(11_33_22_/_0.4)] md:bg-background/80 md:backdrop-blur-md"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-4">
        <Logo />
        <SearchBar className="hidden flex-1 md:block" />
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <div className="hidden items-center gap-1 md:flex">
            <LocaleSwitch />
          </div>
          {!onStorefrontSearch ? <MobileSearch compact className="md:hidden" /> : null}
          <NotificationsBell />
          <CartLink />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
