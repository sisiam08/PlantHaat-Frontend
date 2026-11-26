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
  const { user, isLoading, hasSessionHint, logout } = useAuth();
  const router = useRouter();

  // Reserve the signed-in control's size while /auth/me resolves. With no
  // session hint we already know the visitor is a guest and can show the
  // login action immediately instead of a placeholder that later shifts.
  if (isLoading && hasSessionHint) {
    return <span aria-hidden className="size-11 shrink-0 rounded-full bg-muted/40" />;
  }

  if (!user) {
    return (
      <Button asChild variant="ghost" size="lg" className="min-h-11 px-2.5 sm:px-3">
        <Link href="/login">{t("login")}</Link>
      </Button>
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
        <Button variant="ghost" size="icon-lg" className="rounded-full" aria-label={t("accountMenu")}>
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
