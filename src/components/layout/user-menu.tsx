"use client";

import { Heart, LayoutDashboard, LogOut, Package, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-provider";
import { writeLocaleCookie } from "./locale-switch";

export function UserMenu() {
  const t = useTranslations("shell");
  const locale = useLocale();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [, startTransition] = useTransition();

  if (!user) {
    return (
      <>
        <div className="hidden items-center gap-1.5 md:flex">
          <Button asChild variant="ghost" size="lg">
            <Link href="/login">{t("login")}</Link>
          </Button>
          <Button asChild size="lg">
            <Link href="/register">{t("register")}</Link>
          </Button>
        </div>
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label={t("accountMenu")}>
                <User aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href="/login">{t("login")}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/register">{t("register")}</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={locale}
                onValueChange={(next) => {
                  if (next === locale) return;
                  writeLocaleCookie(next);
                  startTransition(() => router.refresh());
                }}
              >
                <DropdownMenuRadioItem value="bn">{t("languageBn")}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="en">{t("languageEn")}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </>
    );
  }

  const initial = user.name?.trim().charAt(0).toUpperCase() || "?";
  const dashboard =
    user.role === "ADMIN"
      ? { href: "/admin", label: t("adminDashboard") }
      : user.role === "SELLER"
        ? { href: "/seller/dashboard", label: t("sellerDashboard") }
        : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t("accountMenu")}
        >
          <Avatar size="sm">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.name} /> : null}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-sm text-foreground">
          {user.name}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {dashboard ? (
          <DropdownMenuItem asChild>
            <Link href={dashboard.href}>
              <LayoutDashboard aria-hidden /> {dashboard.label}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User aria-hidden /> {t("profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/orders">
            <Package aria-hidden /> {t("myOrders")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/wishlist">
            <Heart aria-hidden /> {t("wishlist")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(next) => {
            if (next === locale) return;
            writeLocaleCookie(next);
            startTransition(() => router.refresh());
          }}
        >
          <DropdownMenuRadioItem value="bn">{t("languageBn")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">{t("languageEn")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            void logout().then(() => router.replace("/"));
          }}
        >
          <LogOut aria-hidden /> {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
