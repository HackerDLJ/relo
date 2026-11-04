"use client";

import { useState } from "react";
import { CreditCard, Check } from "lucide-react";
import { quoteRent, quoteSale, isQuote } from "@relo/core/payments";
import type { BorrowRequest, Item } from "@relo/core/engine";
import { useStore } from "@/lib/store";
import { useToast } from "./toast";
import { payEnabled, startPayment } from "@/lib/pay";
import { dealState, threadIdOf } from "@/lib/chat";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Pay for a sale (after or without a negotiated price) or an approved rental. Renders nothing when there is nothing to pay. */
export function PayButton({ item, request, className = "btn-primary btn-sm" }: { item: Item; request?: BorrowRequest; className?: string }) {
  const { state, me, refresh } = useStore();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const kind = request ? "rent" : "sale";
  const paid = state.payments.find((p) => p.itemId === item.id && p.buyerId === me.id && p.kind === kind && (!request || p.requestId === request.id));
  if (paid) return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"><Check className="h-3.5 w-3.5" aria-hidden />Paid {inr(paid.amount)}</span>;
  if (item.ownerId === me.id || item.id.startsWith("s-")) return null;
  const agreed = dealState(state.messages.filter((m) => m.threadId === threadIdOf(item.id, me.id, "buy"))).agreed;
  const q = request ? quoteRent(item, request) : quoteSale(item, agreed);
  if (!isQuote(q)) return null;
  if (!payEnabled) return <span className="text-xs text-mute">Online payment isn’t switched on yet. Pay the owner directly.</span>;

  async function pay() {
    setBusy(true);
    try {
      const done = await startPayment({ kind, itemId: item.id, requestId: request?.id, payer: me.id });
      if (done) { toast.success("Payment received."); await refresh(); }
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return <button className={className} onClick={pay} disabled={busy}><CreditCard className="h-4 w-4" aria-hidden />{busy ? "Opening…" : `Pay ${inr(q.amountInr)}`}</button>;
}
