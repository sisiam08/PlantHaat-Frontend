"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { QuickAddSheet, type QuickAddProduct } from "@/features/cart/components/quick-add";
import { useAuth } from "@/features/auth/auth-provider";
import { wishlistApi } from "@/features/wishlist/api";
import { queryKeys } from "@/lib/api/query-keys";

/**
 * One delegated client island for every product card on the page. The cards
 * themselves stay server-rendered (no 2×client-component hydration per card);
 * this layer handles wishlist toggles and opens the single quick-add sheet.
 */
export function CardActionsLayer() {
  const t = useTranslations("product");
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [quick, setQuick] = useState<QuickAddProduct | null>(null);

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

  // Reflect saved state + localized names on the static card buttons.
  useEffect(() => {
    const buttons = document.querySelectorAll<HTMLButtonElement>("[data-card-wishlist]");
    buttons.forEach((button) => {
      const slug = button.dataset.slug ?? "";
      const isSaved = savedSlugs.has(slug);
      button.dataset.saved = isSaved ? "true" : "false";
      button.setAttribute("aria-pressed", String(isSaved));
      button.setAttribute(
        "aria-label",
        isSaved ? t("wishlistRemove") : t("wishlistAdd"),
      );
    });
    document.querySelectorAll<HTMLButtonElement>("[data-card-quickadd]").forEach((button) => {
      button.setAttribute("aria-label", t("quickAdd"));
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
      toast.success(
        savedSlugs.has(vars.slug) ? t("wishlistRemoved") : t("wishlistAdded"),
      );
    },
    onError: () => toast.error(t("quickAddError")),
  });

  const onClick = useCallback(
    (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;

      const wish = target.closest<HTMLButtonElement>("[data-card-wishlist]");
      if (wish) {
        event.preventDefault();
        const productId = wish.dataset.productId;
        const slug = wish.dataset.slug;
        if (productId && slug) toggle.mutate({ productId, slug });
        return;
      }

      const quickButton = target.closest<HTMLButtonElement>("[data-card-quickadd]");
      if (quickButton) {
        event.preventDefault();
        setQuick({
          slug: quickButton.dataset.slug ?? "",
          name: quickButton.dataset.name ?? "",
          imageUrl: quickButton.dataset.image ?? null,
          shopName: quickButton.dataset.shop ?? null,
        });
      }
    },
    [toggle],
  );

  useEffect(() => {
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [onClick]);

  return (
    <QuickAddSheet
      product={quick}
      open={Boolean(quick)}
      onOpenChange={(open) => {
        if (!open) setQuick(null);
      }}
    />
  );
}
