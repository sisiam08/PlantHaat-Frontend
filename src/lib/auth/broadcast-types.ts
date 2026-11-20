export type BroadcastMessageType = "refresh" | "logout" | "session:revoked" | "session:expired";

export interface BroadcastMessage {
  type: BroadcastMessageType;
  expiresAt?: number;
  /** Present on refresh after login/refresh so other tabs can spot an account switch. */
  userId?: string;
}
