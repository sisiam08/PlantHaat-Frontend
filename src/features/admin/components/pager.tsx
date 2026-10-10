"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  const t = useTranslations("admin.common");
  if (totalPages <= 1) {
    return null;
  }
  return (
    <div className="flex items-center justify-between">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        {t("prev")}
      </Button>
      <span className="text-sm text-muted-foreground">
        {t("pageOf", { page, total: totalPages })}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        {t("next")}
      </Button>
    </div>
  );
}
