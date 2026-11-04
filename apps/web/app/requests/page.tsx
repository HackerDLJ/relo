"use client";

import Link from "next/link";
import { useState } from "react";
import { Megaphone, Handshake, Search } from "lucide-react";
import type { Need } from "@relo/core/engine";
import { useAct, useStore } from "@/lib/store";
import { useDerived } from "@/lib/derive";
import { Avatar, Badge, EmptyState, Field, Modal, PageHeader, Segmented, fmtRange, ago } from "@/components/ui";
import { NeedForm } from "@/components/forms";
import { CategoryIcon } from "@/components/item-bits";

export default function RequestsPage() {
  const { state, me, trust } = useStore();
  const { actions } = useStore();
  const act = useAct();
  const { matchFor, userById, itemById } = useDerived();
  const [tab, setTab] = useState<"open" | "mine">("open");
  const [form, setForm] = useState(false);
  const [offering, setOffering] = useState<{ need: Need; itemId: string } | null>(null);
  const [msg, setMsg] = useState("");

  const open = state.needs.filter((n) => n.status === "open" && n.borrowerId !== me.id);
  const mine = state.needs.filter((n) => n.borrowerId === me.id).sort((a, b) => (a.status === "open" ? -1 : 1) - (b.status === "open" ? -1 : 1) || b.postedAt.localeCompare(a.postedAt));
  const myItems = state.items.filter((i) => i.ownerId === me.id && i.active);

  return (
    <>
      <PageHeader eyebrow="Two-way matching" title="Community Requests" subtitle="Borrowers post what they need. Owners see who needs what, and RELO shows which of your items fit, with the reasons."
        actions={<button className="btn-primary" onClick={() => setForm(true)}><Megaphone className="h-4 w-4" aria-hidden />Post a need</button>} />
      <div className="mb-5"><Segmented label="Requests view" value={tab} onChange={setTab} options={[{ value: "open", label: `Open needs (${open.length})` }, { value: "mine", label: `My needs (${mine.length})` }]} /></div>

      {tab === "open" && (open.length === 0 ? <EmptyState title="No open needs right now" body="When neighbours post what they need, they appear here." /> : (
        <ul className="space-y-4">{open.map((n) => {
          const b = userById(n.borrowerId);
          const fits = myItems.map((item) => ({ item, m: matchFor(item, { viewer: b, category: n.category, from: n.from, until: n.until, radiusKm: n.radiusKm }) })).filter((x) => x.item.category === n.category).sort((a, c) => c.m.score - a.m.score);
          const offered = new Set(state.offers.filter((o) => o.needId === n.id && o.ownerId === me.id && o.status === "open").map((o) => o.itemId));
          return (
            <li key={n.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3">
                <Avatar name={b.name} size={40} />
                <div className="min-w-0 flex-1"><h3 className="text-base font-semibold text-navy">{n.title}</h3><p className="text-xs text-mute">{b.name} · {b.area} · trust {Math.round(trust(b.id))} · {ago(n.postedAt)}</p></div>
                <div className="flex gap-2"><Badge tone="cyan">{n.category}</Badge>{n.urgency === "urgent" && <Badge tone="red">Urgent</Badge>}</div>
              </div>
              <p className="mt-3 text-sm text-ink">{n.details}</p>
              <p className="mt-2 text-xs text-mute">{fmtRange(n.from, n.until)} · within {n.radiusKm} km · {state.offers.filter((o) => o.needId === n.id && o.status === "open").length} offer(s) so far</p>
              <div className="mt-4 border-t border-line pt-3">
                {fits.length === 0 ? <p className="text-sm text-mute">None of your listed items fit this category. <Link className="font-semibold text-navy-600 underline" href="/listings">List an item</Link></p> : (
                  <><p className="mb-2 text-xs font-semibold text-ink">Your items that fit</p>
                  <ul className="space-y-2">{fits.map(({ item, m }) => (
                    <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-paper p-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-soft text-navy"><CategoryIcon category={item.category} className="h-5 w-5" /></span>
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-navy">{item.title}</p><p className="text-xs text-mute">{m.explanation}{!m.eligible && m.blockers.length ? ` Not offerable: ${m.blockers[0].toLowerCase()}.` : ""}</p></div>
                      <span className="rounded-full bg-navy px-2 py-0.5 text-xs font-bold text-cyan">{m.score}%</span>
                      {offered.has(item.id) ? <Badge tone="green">Offered</Badge> : <button className="btn-accent btn-sm" disabled={!m.eligible} onClick={() => { setOffering({ need: n, itemId: item.id }); setMsg(""); }}><Handshake className="h-3.5 w-3.5" aria-hidden />Offer</button>}
                    </li>))}</ul></>
                )}
              </div>
            </li>);
        })}</ul>))}

      {tab === "mine" && (mine.length === 0 ? <EmptyState title="You haven't posted a need" body="Can't find what you're after in Discover? Post it and let owners nearby offer." action={<button className="btn-primary" onClick={() => setForm(true)}>Post a need</button>} /> : (
        <ul className="space-y-4">{mine.map((n) => {
          const offers = state.offers.filter((o) => o.needId === n.id && o.status !== "withdrawn").map((o) => { const item = itemById(o.itemId)!; return { o, item, m: matchFor(item, { category: n.category, from: n.from, until: n.until, radiusKm: n.radiusKm }) }; }).sort((a, c) => c.m.score - a.m.score);
          const offeredIds = new Set(offers.map((x) => x.item.id));
          const suggestions = state.items.filter((i) => i.active && i.ownerId !== me.id && i.category === n.category && !offeredIds.has(i.id)).map((item) => ({ item, m: matchFor(item, { category: n.category, from: n.from, until: n.until, radiusKm: n.radiusKm }) })).filter((x) => x.m.eligible).sort((a, c) => c.m.score - a.m.score).slice(0, 3);
          return (
            <li key={n.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><h3 className="text-base font-semibold text-navy">{n.title}</h3><p className="text-xs text-mute">{n.category} · {fmtRange(n.from, n.until)} · within {n.radiusKm} km</p></div>
                <Badge tone={n.status === "open" ? "amber" : n.status === "fulfilled" ? "green" : "gray"}>{n.status === "open" ? "Open" : n.status === "fulfilled" ? "Fulfilled" : "Closed"}</Badge>
                {n.status === "open" && <button className="btn-ghost btn-sm" onClick={() => act(() => actions.closeNeed(n.id))}>Close need</button>}</div>
              <p className="mt-2 text-sm text-ink">{n.details}</p>
              <div className="mt-4 border-t border-line pt-3">
                <p className="mb-2 text-xs font-semibold text-ink">Offers from owners ({offers.length}) · compared by match score</p>
                {offers.length === 0 ? <p className="text-sm text-mute">No offers yet. Owners with matching items are notified.</p> : (
                  <div className="grid gap-3 md:grid-cols-2">{offers.map(({ o, item, m }, idx) => (
                    <div key={o.id} className={`rounded-xl border p-3 ${idx === 0 && n.status === "open" ? "border-cyan bg-cyan-soft/40" : "border-line"}`}>
                      <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-navy">{item.title}</p><p className="text-xs text-mute">{userById(o.ownerId).name} · {m.distanceKm.toFixed(1)} km · trust {Math.round(trust(o.ownerId))}</p></div><span className="rounded-full bg-navy px-2 py-0.5 text-xs font-bold text-cyan">{m.score}%</span></div>
                      <p className="mt-2 text-xs text-ink">“{o.message}”</p>
                      <p className="mt-1 text-xs text-mute">{m.explanation} {item.requirements.length ? `Requires: ${item.requirements.join(", ")}.` : ""}</p>
                      <div className="mt-3 flex items-center gap-2">{idx === 0 && n.status === "open" && o.status === "open" && <Badge tone="cyan">Best offer</Badge>}
                        {o.status === "accepted" ? <Badge tone="green">Accepted</Badge> : n.status === "open" ? <button className="btn-primary btn-sm ml-auto" onClick={() => act(() => actions.acceptOffer(o.id))}>Accept offer</button> : null}</div>
                    </div>))}</div>)}
                {n.status === "open" && suggestions.length > 0 && (<><p className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold text-ink"><Search className="h-3.5 w-3.5" aria-hidden />Matching items you can request now</p>
                  <ul className="space-y-2">{suggestions.map(({ item, m }) => <li key={item.id}><Link href={`/discover/${item.id}?from=${n.from}&until=${n.until}`} className="flex items-center gap-3 rounded-xl bg-paper p-3 hover:bg-cyan-soft/50"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-navy">{item.title}</p><p className="text-xs text-mute">{m.explanation}</p></div><span className="rounded-full bg-navy px-2 py-0.5 text-xs font-bold text-cyan">{m.score}%</span></Link></li>)}</ul></>)}
              </div>
            </li>);
        })}</ul>))}

      <NeedForm open={form} onClose={() => { setForm(false); }} />
      <Modal open={!!offering} onClose={() => setOffering(null)} title="Offer your item"
        footer={<><button className="btn-ghost" onClick={() => setOffering(null)}>Cancel</button><button className="btn-primary" onClick={() => { if (offering) { const r = act(() => actions.offerItem(offering.need.id, offering.itemId, msg)); if (r.ok) setOffering(null); } }}>Send offer</button></>}>
        {offering && <div className="space-y-3"><p className="text-sm text-ink">Offering <b>{itemById(offering.itemId)?.title}</b> for “{offering.need.title}”. The borrower can compare offers; you still approve the final request.</p>
          <Field label="Message to the borrower" hint="Optional">{(id) => <textarea id={id} rows={3} className="input" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Pickup details, what's included…" />}</Field></div>}
      </Modal>
    </>
  );
}
