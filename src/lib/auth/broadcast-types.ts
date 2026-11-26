import type { Role } from "@/lib/api/types";

export type BroadcastMessageType = "refresh" | "logout" | "session:revoked" | "session:expired";
export type SessionEndReason = "expired" | "required";

export interface BroadcastMessage {
  type: BroadcastMessageType;
  expiresAt?: number;
  /** Present on refresh after login/refresh so other tabs can spot an account switch. */
  userId?: string;
  /** session:expired only: a real prior session ended, or a guest needs login. */
  reason?: SessionEndReason;
  /** Role of the session that ended, when known (non-sensitive UX hint). */
  role?: Role;
}
