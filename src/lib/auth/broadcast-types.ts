export type BroadcastMessageType = "refresh" | "logout" | "session:revoked";

export interface BroadcastMessage {
  type: BroadcastMessageType;
}
