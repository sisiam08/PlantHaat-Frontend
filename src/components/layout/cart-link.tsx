"use client";

import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { cartApi } from "@/features/cart/api";
import { useGuestCart } from "@/features/cart/use-guest-cart";
import { queryKeys } from "@/lib/api/query-keys";

export function CartLink() {
  const t = useTranslations("shell");
  const { user } = useAuth();
  const guest = useGuestCart();
  const cart = useQuery({
    queryKey: queryKeys.cart,
    queryFn: () => cartApi.get(),
    enabled: Boolean(user),
  });

  const count = user
    ? (cart.data?.itemCount ?? 0)
    : guest.reduce((sum, line) => sum + line.quantity, 0);
  const label = count > 0 ? t("cartAria", { count }) : t("cartEmptyAria");

  return (
    <Button asChild variant="ghost" size="icon-lg" className="relative" aria-label={label}>
      <Link href="/cart">
        <ShoppingBag aria-hidden />
        {count > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[0.65rem] leading-4 font-semibold text-primary-foreground tabular-nums">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}

