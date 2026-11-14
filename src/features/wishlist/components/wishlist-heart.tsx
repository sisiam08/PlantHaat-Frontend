"use client";

import { Heart } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { wishlistApi } from "@/features/wishlist/api";
import { ApiError } from "@/lib/api/common";
import { queryKeys } from "@/lib/api/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

/** Card/PDP wishlist toggle. Guests are sent to login with a return path. */
export function WishlistHeart({
  productId,
  slug,
  className,
}: {
  productId: string;
  slug: string;
  className?: string;
}) {
  const t = useTranslations("product");
  const tErrors = useTranslations("errors");
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<boolean | null>(null);

  const wishlist = useQuery({
    queryKey: queryKeys.wishlist(),
    queryFn: () => wishlistApi.list(1),
    enabled: Boolean(user),
    staleTime: 60 * 1000,
  });
  const saved = wishlist.data?.data.some((item) => item.product.slug === slug) ?? false;
  const shown = optimistic ?? saved;

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) {
        router.push(`/login?returnTo=${encodeURIComponent(pathname)}`);
        return false;
      }
      if (shown) {
        await wishlistApi.remove(productId);
      } else {
        await wishlistApi.add(productId);
      }
      return true;
    },
    onMutate: () => setOptimistic(!shown),
    onSuccess: async (changed) => {
      if (!changed) {
        setOptimistic(null);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.wishlist() });
      toast.success(shown ? t("wishlistRemoved") : t("wishlistAdded"));
      setOptimistic(null);
    },
    onError: (error) => {
      setOptimistic(null);
      toast.error(error instanceof ApiError ? tErrors("generic") : tErrors("generic"));
    },
  });

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      aria-label={shown ? t("wishlistRemove") : t("wishlistAdd")}
      aria-pressed={shown}
      disabled={toggle.isPending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle.mutate();
      }}
      className={cn(
        "rounded-full bg-card/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-card",
        className,
      )}
    >
      <Heart aria-hidden className={cn("size-5", shown && "fill-offer text-offer")} />
    </Button>
  );
}
