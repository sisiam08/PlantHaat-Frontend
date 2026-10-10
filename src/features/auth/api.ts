import { apiDelete, apiGet, apiPost } from "@/lib/api/client";
import type { AuthSessionResponse, PublicUser } from "@/lib/api/types";

export type SellerType = "NURSERY" | "INDIVIDUAL_GROWER" | "RESELLER";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface RegisterSellerInput extends RegisterInput {
  businessName: string;
  contactPhone: string;
  sellerType?: SellerType;
  businessAddress?: string;
}

export interface SessionItem {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export const authApi = {
  me: () => apiGet<PublicUser>("/auth/me").then((result) => result.data),
  login: (input: LoginInput) =>
    apiPost<AuthSessionResponse>("/auth/login", input).then((result) => result.data),
  register: (input: RegisterInput) =>
    apiPost<AuthSessionResponse>("/auth/register", input).then((result) => result.data),
  registerSeller: (input: RegisterSellerInput) =>
    apiPost<AuthSessionResponse>("/auth/register/seller", input).then((result) => result.data),
  logout: () => apiPost<null>("/auth/logout").then(() => undefined),
  logoutAll: () => apiPost<null>("/auth/logout-all").then(() => undefined),
  sessions: () => apiGet<SessionItem[]>("/auth/sessions").then((result) => result.data),
  revokeSession: (id: string) =>
    apiDelete<null>(`/auth/sessions/${encodeURIComponent(id)}`).then(() => undefined),
  verifyEmail: (token: string) =>
    apiPost<{ verified: boolean }>("/auth/verify-email", { token }).then((result) => result.data),
  resendVerification: () =>
    apiPost<{ sent: boolean; alreadyVerified: boolean }>("/auth/resend-verification").then(
      (result) => result.data,
    ),
  forgotPassword: (email: string) =>
    apiPost<{ sent: boolean }>("/auth/forgot-password", { email }).then((result) => result.data),
  resetPassword: (token: string, newPassword: string) =>
    apiPost<{ reset: boolean }>("/auth/reset-password", { token, newPassword }).then(
      (result) => result.data,
    ),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiPost<{ changed: boolean }>("/auth/change-password", { currentPassword, newPassword }).then(
      (result) => result.data,
    ),
};
