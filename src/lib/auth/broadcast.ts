"use client";

import type { BroadcastMessage, BroadcastMessageType } from "./broadcast-types";

export type { BroadcastMessage, BroadcastMessageType };

const CHANNEL = "planthaat-auth";
const LOCAL_EVENT = "planthaat-auth-message";

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
  if (typeof window === "undefined") return;
  const message = { type, ...payload } satisfies BroadcastMessage;
  // BroadcastChannel does not deliver to the sender; the local event keeps the
  // tab that detected the failure in sync with the other tabs.
  window.dispatchEvent(new CustomEvent<BroadcastMessage>(LOCAL_EVENT, { detail: message }));
  getChannel()?.postMessage(message);
}

export function subscribeAuth(listener: (message: BroadcastMessage) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const ch = getChannel();
  const handler = (event: MessageEvent<BroadcastMessage>) => {
    if (event.data && typeof event.data.type === "string") {
      listener(event.data);
    }
  };
  const local = (event: Event) => {
    const message = (event as CustomEvent<BroadcastMessage>).detail;
    if (message && typeof message.type === "string") {
      listener(message);
    }
  };
  ch?.addEventListener("message", handler);
  window.addEventListener(LOCAL_EVENT, local);
  return () => {
    ch?.removeEventListener("message", handler);
    window.removeEventListener(LOCAL_EVENT, local);
  };
}
