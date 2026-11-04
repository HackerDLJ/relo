import type { Message } from "@relo/core/engine";

export const threadIdOf = (itemId: string, borrowerId: string) => `${itemId}:${borrowerId}`;
export const parseThread = (t: string) => { const [itemId, borrowerId] = t.split(":"); return { itemId, borrowerId }; };

export type DealState = {
  /** Price both sides accepted, per day. */
  agreed?: number;
  /** Offer waiting for the other person to answer. */
  pending?: Message;
};

/** Walks the thread: an accepted offer is the agreed deal; a newer offer re-opens the question. */
export function dealState(messages: Message[]): DealState {
  let agreed: number | undefined;
  let pending: Message | undefined;
  for (const m of messages) {
    if (m.kind === "offer") pending = m;
    else if (m.kind === "accept" && pending) { agreed = pending.price; pending = undefined; }
    else if (m.kind === "decline") pending = undefined;
  }
  return { agreed, pending };
}

export const perDay = (n?: number) => (n && n > 0 ? `₹${Math.round(n).toLocaleString("en-IN")}/day` : "Free");
