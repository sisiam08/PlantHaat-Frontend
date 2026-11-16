import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { PaymentIntentStatus } from "../api";

export function PaymentBadge({
  status,
  className,
}: {
  status: PaymentIntentStatus | null | undefined;
  className?: string;
}) {
  const t = useTranslations("payments");
  if (!status) return null;
  const variant =
    status === "PAID" || status === "PARTIALLY_REFUNDED" || status === "REFUNDED"
      ? "default"
      : status === "REJECTED" || status === "EXPIRED"
        ? "destructive"
        : "secondary";
  return (
    <Badge variant={variant} className={className}>
      {t(`status.${status}`)}
    </Badge>
  );
}
