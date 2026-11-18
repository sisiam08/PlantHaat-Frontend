export type BroadcastMessageType = "refresh" | "logout" | "session:revoked" | "session:expired";

export interface BroadcastMessage {
  type: BroadcastMessageType;
  expiresAt?: number;
}
