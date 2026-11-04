"use client";

import Link from "next/link";
import { useState } from "react";
import { Confirm, EmptyState, Badge, PageHeader, Segmented, fmtRange, ago } from "@/components/ui";
import { ItemCard, STATUS_LABEL, STATUS_TONE } from "@/components/item-bits";
import { useAct, useStore } from "@/lib/store";
import { useDerived } from "@/lib/derive";
import type { BorrowRequest } from "@relo/core/engine";

export default function BorrowingPage() {
  const { state, me, trust, today } = useStore();
  const { actions } = useStore();
  const act = useAct();
  const { itemById, userById, alternativesFor } = useDerived();
  const [tab, setTab] = useState<"open" | "closed">("open");
  const [cancel, setCancel] = useState<BorrowRequest | null>(null);
  const mine = state.requests.filter((r) => r.borrowerId === me.id);
  const open = mine.filter((r) => ["pending", "waitlisted", "approved"].includes(r.status)).sort((a, b) => a.from.localeCompare(b.from));
  const closed = mine.filter((r) => ["declined", "cancelled"].includes(r.status)).sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
  const list = tab === "open" ? open : closed;

  return (
    <>
      <PageHeader title="My Borrowing Requests" subtitle="Everything you've asked to borrow, from request to approval. Running loans live in My Loans." />
      <div className="mb-5"><Segmented label="Request status" value={tab} onChange={setTab} options={[{ value: "open", label: `In progress (${open.length})` }, { value: "closed", label: `Declined or cancelled (${closed.length})` }]} /></div>
      {list.length === 0 ? <EmptyState title={tab === "open" ? "No requests in progress" : "Nothing declined or cancelled"} body={tab === "open" ? "Find something in Discover and send your first request." : "Declined and cancelled requests show up here with alternatives."} action={tab === "open" ? <Link href="/discover" className="btn-primary">Discover items</Link> : undefined} /> : (
        <ul className="space-y-4">{list.map((r) => {
          const item = itemById(r.itemId)!;
          const showAlts = r.status === "declined";
          const alts = showAlts ? alternativesFor(item, r.from < today ? today : r.from, r.until < today ? today : r.until, me, 3) : [];
          const queue = r.status === "waitlisted" ? state.requests.filter((x) => x.itemId === r.itemId && x.status === "waitlisted").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)) : [];
          return (
            <li key={r.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1"><Link href={`/discover/${item.id}`} className="text-base font-semibold text-navy hover:underline">{item.title}</Link><p className="text-xs text-mute">{userById(item.ownerId).name} · {fmtRange(r.from, r.until)} · sent {ago(r.submittedAt)}</p></div>
                <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
              </div>
              <p className="mt-2 text-sm text-ink">“{r.purpose}”</p>
              {r.status === "approved" && <p className="mt-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">Approved. {fmtRange(r.from, r.until)} is locked for you. Collect it on {r.from}.</p>}
              {r.status === "pending" && <p className="mt-2 text-xs text-mute">Waiting for {userById(item.ownerId).name} to review. Your request is ranked against others using match, trust, urgency and more, not just who asked first.</p>}
              {r.status === "waitlisted" && <p className="mt-2 rounded-xl bg-cyan-soft p-3 text-sm text-navy-700">You're waitlisted. If the current reservation is cancelled or the item comes back, you're moved back to review with your original submission time. {queue.length > 1 ? `${queue.length} people are waiting.` : ""}</p>}
              {r.status === "declined" && <p className="mt-2 text-sm text-red-800">Declined: {r.declineReason ?? "not available"}.</p>}
              {["pending", "waitlisted", "approved"].includes(r.status) && <div className="mt-3"><button className="btn-ghost btn-sm" onClick={() => setCancel(r)}>Cancel request</button></div>}
              {showAlts && (
                <div className="mt-4 border-t border-line pt-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-600">Next-best alternatives, so you're not stuck</p>
                  {alts.length === 0 ? <p className="text-sm text-mute">No similar items are free for those dates. <Link className="font-semibold text-navy-600 underline" href="/requests">Post a need</Link> and owners can offer one.</p> : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{alts.map((a) => <ItemCard key={a.item.id} item={a.item} ownerName={userById(a.item.ownerId).name} trust={trust(a.item.ownerId)} match={a.match} status={{ label: "Free for your dates", tone: "green" }} href={`/discover/${a.item.id}?from=${r.from}&until=${r.until}`} />)}</div>)}
                </div>)}
            </li>);
        })}</ul>)}
      <Confirm open={!!cancel} title="Cancel this request?" confirmLabel="Cancel request" danger onClose={() => setCancel(null)} onConfirm={() => cancel && act(() => actions.cancelRequest(cancel.id))}
        body={cancel?.status === "approved" ? <>This reservation is approved. Cancelling costs trust points (−1, or −6 if the loan starts within 24 hours), and anyone waitlisted is told the dates are free.</> : <>The owner will be told. No trust penalty applies to requests that weren't approved yet.</>} />
    </>
  );
}
