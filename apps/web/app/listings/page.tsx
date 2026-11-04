"use client";

import { useState } from "react";
import { Pause, Pencil, PackagePlus, Play } from "lucide-react";
import { LOCKING, type Item } from "@relo/core/engine";
import { useAct, useStore } from "@/lib/store";
import { useDerived } from "@/lib/derive";
import { Badge, Confirm, EmptyState, PageHeader, fmtRange } from "@/components/ui";
import { ItemThumb, PriceTags, RefurbBadge, STATUS_LABEL, STATUS_TONE } from "@/components/item-bits";
import { ListingForm } from "@/components/forms";
import { OwnerQueue } from "@/components/owner-queue";

export default function ListingsPage() {
  const { state, me, today } = useStore();
  const { actions } = useStore();
  const act = useAct();
  const { userById } = useDerived();
  const [editing, setEditing] = useState<Item | undefined>();
  const [form, setForm] = useState(false);
  const [pause, setPause] = useState<Item | null>(null);
  const mine = state.items.filter((i) => i.ownerId === me.id);

  return (
    <>
      <PageHeader title="My Listings" subtitle="Items you share. Review requests ranked by transparent rules, approve to lock dates, and record handovers."
        actions={<button className="btn-primary" onClick={() => { setEditing(undefined); setForm(true); }}><PackagePlus className="h-4 w-4" aria-hidden />List an item</button>} />
      {mine.length === 0 ? <EmptyState title="You haven't listed anything yet" body="That drill in the cupboard could save a neighbour a purchase. Listing takes about a minute." action={<button className="btn-primary" onClick={() => { setEditing(undefined); setForm(true); }}>List your first item</button>} /> : (
        <ul className="space-y-6">{mine.map((item) => {
          const reviewable = state.requests.filter((r) => r.itemId === item.id && (r.status === "pending" || r.status === "waitlisted")).length;
          const locked = state.requests.filter((r) => r.itemId === item.id && LOCKING.has(r.status)).sort((a, b) => a.from.localeCompare(b.from));
          const history = state.requests.filter((r) => r.itemId === item.id && r.status === "returned").length;
          return (
            <li key={item.id} className="card p-4 sm:p-5">
              <div className="flex gap-4">
                <div className="w-24 shrink-0 sm:w-32"><ItemThumb item={item} className="h-24 sm:h-28" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-navy">{item.title}</h2>{item.sold ? <Badge tone="red">Sold</Badge> : item.active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Paused</Badge>}{item.refurb && <RefurbBadge item={item} />}<span className="ml-auto"><PriceTags item={item} /></span></div>
                  <p className="mt-0.5 text-xs text-mute">{item.category} · {item.condition} · {item.areaLabel} · {item.sold ? `sold for ₹${item.sold.price.toLocaleString("en-IN")}` : (item.mode ?? "rent") === "sell" ? "for sale" : `shared ${fmtRange(item.availableFrom, item.availableUntil)} · ${history} past loan${history === 1 ? "" : "s"}`}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-mute">{item.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-ghost btn-sm" onClick={() => { setEditing(item); setForm(true); }}><Pencil className="h-3.5 w-3.5" aria-hidden />Edit</button>
                    {item.sold ? null : item.active ? <button className="btn-ghost btn-sm" onClick={() => setPause(item)}><Pause className="h-3.5 w-3.5" aria-hidden />Pause listing</button> : <button className="btn-accent btn-sm" onClick={() => act(() => actions.toggleItem(item.id))}><Play className="h-3.5 w-3.5" aria-hidden />Reactivate</button>}
                  </div>
                </div>
              </div>

              {locked.length > 0 && (
                <div className="mt-4 border-t border-line pt-3"><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-600">Reserved and borrowed</h3>
                  <ul className="space-y-2">{locked.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-paper p-3 text-sm"><span className="font-semibold text-navy">{userById(r.borrowerId).name}</span><span className="text-mute">{fmtRange(r.from, r.until)}</span>{state.payments.some((p) => p.requestId === r.id) && <Badge tone="green">Paid online</Badge>}<Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      {r.status === "approved" && <button className="btn-primary btn-sm ml-auto" disabled={r.from > today} title={r.from > today ? `Available from ${r.from}` : undefined} onClick={() => act(() => actions.startLoan(r.id))}>Record handover</button>}
                      {r.status === "active" && <a href="/returns" className="btn-ghost btn-sm ml-auto">Manage return</a>}</li>))}</ul></div>
              )}

              <div className="mt-4 border-t border-line pt-3"><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-600">Incoming requests{reviewable ? ` (${reviewable})` : ""}</h3><OwnerQueue item={item} /></div>
            </li>);
        })}</ul>)}
      <ListingForm open={form} onClose={() => setForm(false)} item={editing} />
      <Confirm open={!!pause} title="Pause this listing?" confirmLabel="Pause listing" danger onClose={() => setPause(null)} onConfirm={() => pause && act(() => actions.toggleItem(pause.id))}
        body={<>“{pause?.title}” will disappear from Discover and any pending or waitlisted requests will be closed with a notice. Approved or active loans must finish first.</>} />
    </>
  );
}
