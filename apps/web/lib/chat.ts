import type { Message } from "@relo/core/engine";

/** "rent" chats negotiate a per-day rate; "buy" chats negotiate the sale price. Buy threads end in ":buy". */
export type DealKind = "rent" | "buy";
export const threadIdOf = (itemId: string, borrowerId: string, kind: DealKind = "rent") => `${itemId}:${borrowerId}${kind === "buy" ? ":buy" : ""}`;
export const parseThread = (t: string) => { const [itemId, borrowerId, k] = t.split(":"); return { itemId, borrowerId, kind: (k === "buy" ? "buy" : "rent") as DealKind }; };
export const money = (n: number | undefined, kind: DealKind) => (kind === "buy" ? `₹${Math.round(n ?? 0).toLocaleString("en-IN")}` : perDay(n));

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
