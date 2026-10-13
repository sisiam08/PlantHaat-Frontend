"use client";

import { useTranslations } from "next-intl";

import { CartLink } from "./cart-link";
import { LocaleSwitch } from "./locale-switch";
import { Logo } from "./logo";
import { NotificationsBell } from "./notifications-bell";
import { SearchBar } from "./search-bar";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  const t = useTranslations("shell");

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4">
        <Logo />
        <SearchBar className="hidden flex-1 md:block" />
        <div className="ml-auto flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
            <LocaleSwitch />
          </div>
          <NotificationsBell />
          <CartLink />
          <UserMenu />
        </div>
      </div>
      <div className="px-4 pb-3 md:hidden">
        <SearchBar />
      </div>
    </header>
  );
}
