"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import { wishlistApi } from "@/features/wishlist/api";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * One delegated client island for every product card on the page. Cards stay
 * server-rendered (single PDP link); this layer owns only the wishlist heart.
 */
export function CardActionsLayer() {
  const t = useTranslations("product");
  const tErrors = useTranslations("errors");
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const wishlist = useQuery({
    queryKey: queryKeys.wishlist(),
    queryFn: () => wishlistApi.list(1),
    enabled: Boolean(user),
    staleTime: 60 * 1000,
  });

  const savedSlugs = useMemo(
    () => new Set((wishlist.data?.data ?? []).map((item) => item.product.slug)),
    [wishlist.data],
  );

  useEffect(() => {
    document.querySelectorAll<HTMLButtonElement>("[data-card-wishlist]").forEach((button) => {
      const isSaved = savedSlugs.has(button.dataset.slug ?? "");
      button.dataset.saved = isSaved ? "true" : "false";
      button.setAttribute("aria-pressed", String(isSaved));
    });
  }, [savedSlugs, t, wishlist.data]);

  const toggle = useMutation({
    mutationFn: async ({ productId, slug }: { productId: string; slug: string }) => {
      if (!user) {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
        return false;
      }
      if (savedSlugs.has(slug)) {
        await wishlistApi.remove(productId);
      } else {
        await wishlistApi.add(productId);
      }
      return true;
    },
    onSuccess: async (changed, vars) => {
      if (!changed) return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.wishlist() });
      toast.success(savedSlugs.has(vars.slug) ? t("wishlistRemoved") : t("wishlistAdded"));
    },
    onError: () => toast.error(tErrors("generic")),
  });

  const onClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as Element | null;
      const wish = target?.closest<HTMLButtonElement>("[data-card-wishlist]");
      if (!wish) return;
      event.preventDefault();
      const productId = wish.dataset.productId;
      const slug = wish.dataset.slug;
      if (productId && slug) toggle.mutate({ productId, slug });
    },
    [toggle],
  );

  useEffect(() => {
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [onClick]);

  return null;
}
