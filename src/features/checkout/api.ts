import { apiPost } from "@/lib/api/client";
import type { OrderDetailView } from "../orders/types";

export interface CheckoutInput {
  addressId: string;
  paymentMethod: "COD";
  note?: string;
}

export const checkoutApi = {
  place: (input: CheckoutInput, idempotencyKey: string) =>
    apiPost<OrderDetailView>("/checkout", input, {
      headers: { "Idempotency-Key": idempotencyKey },
    }).then((result) => result.data),
};
