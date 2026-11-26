import { apiGet, apiPost } from "@/lib/api/client";
import { uploadsApi } from "@/features/uploads/api";

export type PaymentProvider = "BKASH" | "NAGAD" | "ROCKET" | "UPAY";
export const PAYMENT_PROVIDER_LABEL: Record<PaymentProvider, string> = {
  BKASH: "bKash",
  NAGAD: "Nagad",
  ROCKET: "Rocket",
  UPAY: "Upay",
};

export type PaymentIntentStatus =
  | "UNPAID"
  | "PENDING_VERIFICATION"
  | "PAID"
  | "REJECTED"
  | "EXPIRED"
  | "PARTIALLY_REFUNDED"
  | "REFUNDED";

export type PaymentSubmissionStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface ProviderAccount {
  provider: PaymentProvider;
  number: string;
}

export interface PaymentInstructions {
  providers: ProviderAccount[];
  instructions: string;
  warningText: string;
  accountNote: string;
  verificationText: string;
  expiryHours: number;
  slaHours: number;
  lateGraceHours: number;
  capturedAt: string;
}

export interface PaymentSubmissionView {
  id: string;
  provider: PaymentProvider;
  trxId: string;
  senderNumber: string;
  proofUrl: string | null;
  status: PaymentSubmissionStatus;
  amountReceived: string | null;
  rejectReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface BuyerPaymentInfo {
  id: string;
  orderId: string;
  orderNumber: string;
  status: PaymentIntentStatus;
  amountDue: string;
  paidAmount: string;
  remainingAmount: string;
  currency: string;
  expiresAt: string;
  paidAt: string | null;
  refundedAmount: string;
  instructions: PaymentInstructions;
  submissions: PaymentSubmissionView[];
}

export interface AdminPaymentRow {
  id: string;
  orderId: string;
  orderNumber: string;
  status: PaymentIntentStatus;
  amountDue: string;
  refundedAmount: string;
  expiresAt: string;
  createdAt: string;
  slaAlertedAt: string | null;
  underSla: boolean;
  buyer: { id: string; name: string };
  contactPhone: string;
  submissions: PaymentSubmissionView[];
}

export interface RefundObligationRow {
  id: string;
  intentId: string;
  shopOrderId: string | null;
  amount: string;
  status: "REFUND_REQUIRED" | "REFUND_PAYABLE" | "COMPLETED";
  reason: string;
  refundTrxId: string | null;
  completedAt: string | null;
  createdAt: string;
  intent: {
    orderId: string;
    amountDue: string;
    order: { orderNumber: string; customerId: string; customer: { name: string } };
  };
}

export interface SellerPaymentStatus {
  status: PaymentIntentStatus | null;
  amountDue: string | null;
  paidAt: string | null;
  refundedAmount: string | null;
}

export interface SubmitPaymentInput {
  provider: PaymentProvider;
  trxId: string;
  senderNumber: string;
  proofUrl?: string;
}

export const paymentsApi = {
  get: (orderId: string) =>
    apiGet<BuyerPaymentInfo>(`/advance-payments/orders/${encodeURIComponent(orderId)}`).then(
      (result) => result.data,
    ),
  submit: (orderId: string, input: SubmitPaymentInput) =>
    apiPost<{ id: string; status: string; idempotent: boolean }>(
      `/advance-payments/orders/${encodeURIComponent(orderId)}/submissions`,
      input,
    ).then((result) => result.data),
  uploadProof: (file: File) => uploadsApi.image(file, "payment"),
  sellerStatus: (shopOrderId: string) =>
    apiGet<SellerPaymentStatus>(
      `/seller/orders/${encodeURIComponent(shopOrderId)}/advance-payment`,
    ).then((result) => result.data),
  admin: {
    list: (filter?: "pending" | "sla") =>
      apiGet<AdminPaymentRow[]>("/admin/advance-payments", {
        params: filter ? { filter } : undefined,
      }).then((result) => result.data),
    verify: (id: string, amountReceived: number) =>
      apiPost<{ status: string; remainingAmount: string; overpaidAmount?: string; reinstated?: boolean }>(
        `/admin/advance-payments/${encodeURIComponent(id)}/verify`,
        { amountReceived },
      ).then((result) => result.data),
    reject: (id: string, reason: string) =>
      apiPost<null>(`/admin/advance-payments/${encodeURIComponent(id)}/reject`, { reason }).then(
        () => undefined,
      ),
    refunds: () =>
      apiGet<RefundObligationRow[]>("/admin/advance-refunds").then((result) => result.data),
    completeRefund: (id: string, refundTrxId: string) =>
      apiPost<null>(`/admin/advance-refunds/${encodeURIComponent(id)}/complete`, {
        refundTrxId,
      }).then(() => undefined),
  },
};
