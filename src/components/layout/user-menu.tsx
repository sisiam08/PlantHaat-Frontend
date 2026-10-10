"use client";

import { Heart, LayoutDashboard, LogOut, Package, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-provider";

export function UserMenu() {
  const t = useTranslations("shell");
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">{t("login")}</Link>
        </Button>
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/register">{t("register")}</Link>
        </Button>
      </div>
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
