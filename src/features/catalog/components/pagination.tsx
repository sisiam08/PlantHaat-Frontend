import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/lib/api/common";
import { productsHref, type ProductQuery } from "../query";

export async function Pagination({
  meta,
  query,
}: {
  meta: PaginationMeta;
  query: ProductQuery;
}) {
  if (meta.totalPages <= 1) {
    return null;
  }
  const t = await getTranslations("catalog");
  const prevQuery = { ...query, page: Math.max(1, meta.page - 1) };
  const nextQuery = { ...query, page: Math.min(meta.totalPages, meta.page + 1) };

  return (
    <nav className="flex items-center justify-between gap-4 pt-2" aria-label="Pagination">
      {meta.page > 1 ? (
        <Button asChild variant="outline">
          <Link href={productsHref(prevQuery)}>{t("prev")}</Link>
        </Button>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground">
        {meta.page} / {meta.totalPages}
      </span>
      {meta.page < meta.totalPages ? (
        <Button asChild variant="outline">
          <Link href={productsHref(nextQuery)}>{t("next")}</Link>
        </Button>
      ) : (
        <span />
      )}
    </nav>
  );
}
