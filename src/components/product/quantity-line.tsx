"use client";

import { useTranslations } from "next-intl";

import { formatCount } from "@/lib/format/number";
import { cn } from "@/lib/utils";

import { Price } from "./price";

/**
 * The single way the app explains a line quantity and unit price. The product
 * name sits on its own line; this is the secondary line beneath it.
 */
export function QuantityLine({
  quantity,
  unitPrice,
  locale,
  className,
}: {
  quantity: number;
  unitPrice: string | number | null | undefined;
  locale: string;
  className?: string;
}) {
  const t = useTranslations("common");
  const count = formatCount(quantity, locale);
  const price = <Price value={unitPrice} locale={locale} size="sm" />;

  return (
    <span
      data-quantity-line
      className={cn(
        "inline-flex flex-wrap items-baseline gap-x-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span>{t("quantityShort", { count })}</span>
      <span aria-hidden> · </span>
      {locale === "bn" ? (
        <span>
          <span>{t("each")}</span> {price}
        </span>
      ) : (
        <span>
          {price} <span>{t("each")}</span>
        </span>
      )}
    </span>
  );
}

/**
 * A product line shared by checkout, order summaries and order detail pages:
 * name line, quantity/unit secondary line, line total aligned right.
 */
export function ProductLine({
  name,
  variantName,
  quantity,
  unitPrice,
  lineTotal,
  locale,
  className,
}: {
  name: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: string | number | null | undefined;
  lineTotal: string | number | null | undefined;
  locale: string;
  className?: string;
}) {
  return (
    <div data-product-line className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <p className="line-clamp-2 font-medium leading-snug" title={name}>
          {name}
          {variantName ? (
            <span className="font-normal text-muted-foreground"> · {variantName}</span>
          ) : null}
        </p>
        <QuantityLine
          quantity={quantity}
          unitPrice={unitPrice}
          locale={locale}
          className="mt-0.5"
        />
      </div>
      <span data-product-line-total className="shrink-0 text-right font-semibold tabular-nums">
        <Price value={lineTotal} locale={locale} size="sm" />
      </span>
    </div>
  );
}
