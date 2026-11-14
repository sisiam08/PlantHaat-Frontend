import { formatBdt } from "@/lib/format/money";
import { cn } from "@/lib/utils";

type PriceSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<PriceSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-3xl",
  xl: "text-xl",
};

function moneyParts(value: string | number, locale: string) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return [];
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-BD", {
    style: "currency",
    currency: "BDT",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).formatToParts(numeric);
}

function Amount({ value, locale }: { value: string | number; locale: string }) {
  return (
    <>
      {moneyParts(value, locale).map((part, index) =>
        part.type === "currency" ? (
          <span key={index} className="price-currency">
            {part.value}
          </span>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </>
  );
}

/**
 * The one price renderer. Plain body font, tabular numerals, no display face,
 * no italic, no tracking. The ৳ is an explicit span so it can be optically
 * matched to the Inter digits in English.
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
  if (formatBdt(value, locale) === "") return null;

  const compare = formatBdt(compareAt, locale);
  const showCompare =
    Boolean(compare) && Number(compareAt) > Number(value) && Number.isFinite(Number(compareAt));

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-baseline gap-1.5 font-sans tracking-normal tabular-nums",
        className,
      )}
    >
      <span className={cn("font-bold whitespace-nowrap", SIZE[size])}>
        <Amount value={value as string | number} locale={locale} />
        {hasRange ? (
          <>
            <span aria-hidden> – </span>
            <Amount value={maxValue as string | number} locale={locale} />
          </>
        ) : null}
      </span>
      {showCompare ? (
        <span
          className={cn(
            "text-xs font-normal whitespace-nowrap text-muted-foreground line-through",
            compareClassName,
          )}
        >
          <Amount value={compareAt as string | number} locale={locale} />
        </span>
      ) : null}
    </span>
  );
}
