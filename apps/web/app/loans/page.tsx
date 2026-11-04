"use client";

import Link from "next/link";
import { useState } from "react";
import { type BorrowRequest } from "@relo/core/engine";
import { useAct, useStore } from "@/lib/store";
import { useDerived } from "@/lib/derive";
import { Badge, Confirm, EmptyState, PageHeader, Segmented, fmtRange, fmtDate } from "@/components/ui";
import { DueBadge, ExtensionDialog, ReturnDialog } from "@/components/loan-bits";
import { STATUS_LABEL, STATUS_TONE } from "@/components/item-bits";

type Role = "borrowing" | "lending";
type Tab = "active" | "upcoming" | "history";

export default function LoansPage() {
  const { state, me, today } = useStore();
  const { actions } = useStore();
  const act = useAct();
  const { itemById, userById } = useDerived();
  const [role, setRole] = useState<Role>("borrowing");
  const [tab, setTab] = useState<Tab>("active");
  const [ext, setExt] = useState<BorrowRequest | null>(null);
  const [ret, setRet] = useState<BorrowRequest | null>(null);
  const [cancel, setCancel] = useState<BorrowRequest | null>(null);

  const mineAsBorrower = (r: BorrowRequest) => r.borrowerId === me.id;
  const mineAsOwner = (r: BorrowRequest) => itemById(r.itemId)?.ownerId === me.id;
  const base = state.requests.filter(role === "borrowing" ? mineAsBorrower : mineAsOwner);
  const lists: Record<Tab, BorrowRequest[]> = {
    active: base.filter((r) => r.status === "active").sort((a, b) => a.until.localeCompare(b.until)),
    upcoming: base.filter((r) => r.status === "approved").sort((a, b) => a.from.localeCompare(b.from)),
    history: base.filter((r) => r.status === "returned").sort((a, b) => (b.returnedAt ?? "").localeCompare(a.returnedAt ?? "")),
  };
  const list = lists[tab];

  return (
    <>
      <PageHeader title="My Loans" subtitle="Items you have borrowed or lent: what's running, what's coming up, and what you've completed." />
      <div className="mb-4 flex flex-wrap gap-3">
        <Segmented label="Role" value={role} onChange={setRole} options={[{ value: "borrowing", label: "I'm borrowing" }, { value: "lending", label: "I'm lending" }]} />
        <Segmented label="Loan stage" value={tab} onChange={setTab} options={[{ value: "active", label: `Active (${lists.active.length})` }, { value: "upcoming", label: `Upcoming (${lists.upcoming.length})` }, { value: "history", label: `History (${lists.history.length})` }]} />
      </div>
      {list.length === 0 ? <EmptyState title={`No ${tab} loans`} body={tab === "active" ? "Nothing is out right now." : tab === "upcoming" ? "Approved loans that haven't started appear here." : "Completed loans build your trust and impact."} action={<Link className="btn-primary" href={role === "borrowing" ? "/discover" : "/listings"}>{role === "borrowing" ? "Discover items" : "Go to My Listings"}</Link>} /> : (
        <ul className="space-y-3">{list.map((r) => {
          const item = itemById(r.itemId)!;
          const other = userById(role === "borrowing" ? item.ownerId : r.borrowerId);
          return (
            <li key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1"><Link href={`/discover/${item.id}`} className="text-base font-semibold text-navy hover:underline">{item.title}</Link>
                  <p className="text-xs text-mute">{role === "borrowing" ? "From" : "To"} {other.name} · {fmtRange(r.from, r.until)}{r.status === "returned" && r.returnedAt ? ` · returned ${fmtDate(r.returnedAt)}` : ""}</p></div>
                {r.status === "active" ? <DueBadge r={r} /> : <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>}
              </div>
              {r.extension && <p className="mt-2 text-xs text-mute">Extension to {fmtDate(r.extension.requestedUntil)}: <b className="text-ink">{r.extension.status}</b> ({r.extension.reason})</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {role === "borrowing" && r.status === "active" && <>
                  <button className="btn-ghost btn-sm" disabled={r.extension?.status === "pending"} onClick={() => setExt(r)}>{r.extension?.status === "pending" ? "Extension pending" : "Request extension"}</button>
                  <button className="btn-primary btn-sm" onClick={() => act(() => actions.notifyReturned(r.id))}>I've returned it</button></>}
                {role === "borrowing" && r.status === "approved" && <button className="btn-danger btn-sm" onClick={() => setCancel(r)}>Cancel loan</button>}
                {role === "lending" && r.status === "approved" && <button className="btn-primary btn-sm" disabled={r.from > today} onClick={() => act(() => actions.startLoan(r.id))}>{r.from > today ? `Handover from ${fmtDate(r.from)}` : "Record handover"}</button>}
                {role === "lending" && r.status === "active" && <>
                  {r.extension?.status === "pending" && <><button className="btn-accent btn-sm" onClick={() => act(() => actions.resolveExtension(r.id, true))}>Approve extension</button><button className="btn-ghost btn-sm" onClick={() => act(() => actions.resolveExtension(r.id, false))}>Decline</button></>}
                  <button className="btn-primary btn-sm" onClick={() => setRet(r)}>Confirm return</button></>}
              </div>
            </li>);
        })}</ul>)}
      <ExtensionDialog r={ext} onClose={() => setExt(null)} />
      <ReturnDialog r={ret} onClose={() => setRet(null)} />
      <Confirm open={!!cancel} title="Cancel this loan?" confirmLabel="Cancel loan" danger onClose={() => setCancel(null)} onConfirm={() => cancel && act(() => actions.cancelRequest(cancel.id))}
        body={<>The reservation is released and waitlisted neighbours are told. Cancelling an approved loan lowers your trust score (−1, or −6 within 24 hours of the start).</>} />
    </>
  );
}
