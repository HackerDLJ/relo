"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Megaphone, PackagePlus, ShieldCheck, Leaf, Repeat, Inbox } from "lucide-react";
import { estimateImpact, summarizeTrust, overdueStatus } from "@relo/core/engine";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/derive";
import { Badge, EmptyState, PageHeader, Stat, fmtRange, inr } from "@/components/ui";
import { ItemCard } from "@/components/item-bits";
import { ListingForm, NeedForm } from "@/components/forms";

export default function HomePage() {
  const { state, me, today, trust } = useStore();
  const { matchFor, userById } = useDerived();
  const [listing, setListing] = useState(false);
  const [need, setNeed] = useState(false);

  const t = summarizeTrust(state.trustEvents.filter((e) => e.userId === me.id));
  const impact = estimateImpact(state.items, state.requests);
  const mineItemIds = new Set(state.items.filter((i) => i.ownerId === me.id).map((i) => i.id));
  const incoming = state.requests.filter((r) => mineItemIds.has(r.itemId) && r.status === "pending");
  const ext = state.requests.filter((r) => mineItemIds.has(r.itemId) && r.status === "active" && r.extension?.status === "pending");
  const dueSoon = state.requests.filter((r) => r.borrowerId === me.id && r.status === "active").map((r) => ({ r, s: overdueStatus(r, today, state.settings) })).sort((a, b) => a.s.daysLeft - b.s.daysLeft);

  // Smart recommendations: best-scoring available items from others, for the next 14 days.
  const recs = state.items.filter((i) => i.ownerId !== me.id && i.active).map((item) => ({ item, m: matchFor(item) })).sort((a, b) => b.m.score - a.m.score).slice(0, 3);
  const nearby = state.items.filter((i) => i.ownerId !== me.id && i.active).map((item) => ({ item, m: matchFor(item) })).sort((a, b) => a.m.distanceKm - b.m.distanceKm).slice(0, 4);
  const needs = state.needs.filter((n) => n.status === "open" && n.borrowerId !== me.id).slice(0, 3);

  const statusOf = (id: string) => {
    const it = state.items.find((i) => i.id === id)!;
    const free = matchFor(it).parts.find((p) => p.key === "dates")!;
    return free.points >= free.max * 0.7 ? { label: "Available", tone: "green" as const } : free.points > 0 ? { label: "Partly booked", tone: "amber" as const } : { label: "Booked", tone: "gray" as const };
  };

  return (
    <>
      <PageHeader eyebrow="Find it. Share it. Borrow it. Return it. Reuse it." title={`Good to see you, ${me.name.split(" ")[0]}`} subtitle={`Neighbours in ${me.area} have ${state.items.filter((i) => i.active && i.ownerId !== me.id).length} items to share and ${state.needs.filter((n) => n.status === "open").length} open needs.`}
        actions={<><button className="btn-primary" onClick={() => setListing(true)}><PackagePlus className="h-4 w-4" aria-hidden />List an item</button><button className="btn-ghost" onClick={() => setNeed(true)}><Megaphone className="h-4 w-4" aria-hidden />Post a need</button></>} />

      <section aria-label="Your numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/trust" className="block"><Stat label="Your trust score" value={t.score} sub={t.level} icon={<ShieldCheck className="h-4 w-4" aria-hidden />} /></Link>
        <Link href="/listings" className="block"><Stat label="Awaiting your review" value={incoming.length + ext.length} sub={ext.length ? `${incoming.length} requests, ${ext.length} extension` : "borrowing requests"} icon={<Inbox className="h-4 w-4" aria-hidden />} /></Link>
        <Link href="/impact" className="block"><Stat label="Community reuse events" value={impact.reuseEvents} sub="estimated impact inside" icon={<Repeat className="h-4 w-4" aria-hidden />} /></Link>
        <Link href="/impact" className="block"><Stat label="Est. money saved" value={inr(impact.moneySavedInr)} sub="estimate, see assumptions" icon={<Leaf className="h-4 w-4" aria-hidden />} /></Link>
      </section>

      {(incoming.length > 0 || ext.length > 0 || dueSoon.length > 0) && (
        <section className="mt-8" aria-labelledby="attn">
          <h2 id="attn" className="mb-3 text-lg font-semibold text-navy">Needs your attention</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {incoming.slice(0, 3).map((r) => { const it = state.items.find((i) => i.id === r.itemId)!; return (
              <Link key={r.id} href="/listings" className="card flex items-center gap-3 p-4 hover:shadow-pop"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-navy">{userById(r.borrowerId).name} wants {it.title}</p><p className="text-xs text-mute">{fmtRange(r.from, r.until)} · review and rank</p></div><Badge tone="amber">Review</Badge></Link>); })}
            {ext.map((r) => <Link key={r.id} href="/returns" className="card flex items-center gap-3 p-4 hover:shadow-pop"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-navy">Extension request on {state.items.find((i) => i.id === r.itemId)!.title}</p><p className="text-xs text-mute">Until {r.extension!.requestedUntil}</p></div><Badge tone="cyan">Decide</Badge></Link>)}
            {dueSoon.slice(0, 2).map(({ r, s }) => <Link key={r.id} href="/loans" className="card flex items-center gap-3 p-4 hover:shadow-pop"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-navy">Return {state.items.find((i) => i.id === r.itemId)!.title}</p><p className="text-xs text-mute">{s.action}</p></div><Badge tone={s.daysLate > 0 ? "red" : "navy"}>{s.label}</Badge></Link>)}
          </div>
        </section>
      )}

      <section className="mt-8" aria-labelledby="rec">
        <div className="mb-3 flex items-end justify-between"><h2 id="rec" className="text-lg font-semibold text-navy">Recommended for you</h2><Link href="/discover" className="inline-flex items-center gap-1 text-sm font-semibold text-navy-600 hover:underline">Discover all <ArrowRight className="h-4 w-4" aria-hidden /></Link></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{recs.map(({ item, m }) => <ItemCard key={item.id} item={item} ownerName={userById(item.ownerId).name} trust={trust(item.ownerId)} match={m} status={statusOf(item.id)} href={`/discover/${item.id}`} />)}</div>
        <p className="mt-2 text-xs text-mute">Ranked by distance, availability over the next 14 days and owner trust. Open an item to see exactly why.</p>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="near">
          <h2 id="near" className="mb-3 text-lg font-semibold text-navy">Nearby resources</h2>
          <div className="grid gap-4 sm:grid-cols-2">{nearby.map(({ item, m }) => <ItemCard key={item.id} item={item} ownerName={userById(item.ownerId).name} trust={trust(item.ownerId)} match={m} status={statusOf(item.id)} href={`/discover/${item.id}`} />)}</div>
        </section>
        <section aria-labelledby="needs">
          <h2 id="needs" className="mb-3 text-lg font-semibold text-navy">Open community requests</h2>
          {needs.length === 0 ? <EmptyState title="No open requests" body="When neighbours post needs, you'll see the ones you could help with here." /> : (
            <ul className="space-y-3">{needs.map((n) => (
              <li key={n.id}><Link href="/requests" className="card block p-4 hover:shadow-pop"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-navy">{n.title}</p>{n.urgency === "urgent" && <Badge tone="red">Urgent</Badge>}</div><p className="mt-1 text-xs text-mute">{userById(n.borrowerId).name} · {n.category} · {fmtRange(n.from, n.until)}</p>
                {state.items.some((i) => i.ownerId === me.id && i.active && i.category === n.category) && <p className="mt-2 text-xs font-semibold text-[#0E7BAA]">You have a matching item. Offer it →</p>}</Link></li>))}</ul>
          )}
        </section>
      </div>

      <ListingForm open={listing} onClose={() => setListing(false)} />
      <NeedForm open={need} onClose={() => setNeed(false)} />
    </>
  );
}
