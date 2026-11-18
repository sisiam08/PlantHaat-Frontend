"use client";

import type { BroadcastMessage, BroadcastMessageType } from "./broadcast-types";

export type { BroadcastMessage, BroadcastMessageType };

const CHANNEL = "planthaat-auth";

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL);
  }
  return channel;
}

export function broadcastAuth(
  type: BroadcastMessageType,
  payload: Omit<BroadcastMessage, "type"> = {},
): void {
  getChannel()?.postMessage({ type, ...payload } satisfies BroadcastMessage);
}

export function subscribeAuth(listener: (message: BroadcastMessage) => void): () => void {
  const ch = getChannel();
  if (!ch) {
    return () => {};
  }
  const handler = (event: MessageEvent<BroadcastMessage>) => {
    if (event.data && typeof event.data.type === "string") {
      listener(event.data);
    }
  };
  ch.addEventListener("message", handler);
  return () => ch.removeEventListener("message", handler);
}
