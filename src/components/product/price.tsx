import { formatBdt, formatPriceRange } from "@/lib/format/money";
import { cn } from "@/lib/utils";

type PriceSize = "sm" | "md" | "lg";

const SIZE: Record<PriceSize, string> = {
  sm: "text-[0.95rem]",
  md: "text-base",
  lg: "text-3xl",
};

/**
 * The one price renderer. Plain body font, tabular numerals, no display face,
 * no italic, no tracking. Selling price is 700; compare-at is muted and
 * struck through at a smaller size.
 */
export function Price({
  value,
  maxValue,
  compareAt,
  locale = "bn",
  size = "md",
  className,
  compareClassName,
}: {
  value: string | number | null | undefined;
  maxValue?: string | number | null;
  compareAt?: string | number | null;
  locale?: string;
  size?: PriceSize;
  className?: string;
  compareClassName?: string;
}) {
  const hasRange =
    maxValue !== null &&
    maxValue !== undefined &&
    String(maxValue) !== "" &&
    String(maxValue) !== String(value);
  const selling = hasRange
    ? formatPriceRange(value, maxValue, locale)
    : formatBdt(value, locale);
  if (!selling) return null;

  const compare = formatBdt(compareAt, locale);
  const showCompare =
    Boolean(compare) &&
    Number(compareAt) > Number(value) &&
    Number.isFinite(Number(compareAt));

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-baseline gap-1.5 font-sans tracking-normal tabular-nums",
        className,
      )}
    >
      <span className={cn("font-bold whitespace-nowrap", SIZE[size])}>{selling}</span>
      {showCompare ? (
        <span
          className={cn(
            "text-xs font-normal whitespace-nowrap text-muted-foreground line-through",
            compareClassName,
          )}
        >
          {compare}
        </span>
      ) : null}
    </span>
  );
}
