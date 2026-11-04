"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowLeft, MapPin, ShieldCheck, CalendarCheck, MessageSquare } from "lucide-react";
import { LOCKING, canRent, canSell, summarizeTrust } from "@relo/core/engine";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/derive";
import { Avatar, Badge, EmptyState, PageHeader, Spinner, fmtRange } from "@/components/ui";
import { ItemCard, ItemThumb, MatchBreakdown, RefurbBadge, gradeText } from "@/components/item-bits";
import { perDay, threadIdOf } from "@/lib/chat";
import { photoCredit } from "@/lib/catalog";
import { BadgeCheck, ShoppingBag } from "lucide-react";
import { RequestDialog } from "@/components/forms";

function Detail() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const { state, me, today, trust } = useStore();
  const { itemById, matchFor, userById, alternativesFor } = useDerived();
  const [req, setReq] = useState(false);
  const item = itemById(id);
  if (!item) return <EmptyState title="Item not found" body="It may have been removed or you followed an old link." action={<Link className="btn-primary" href="/discover">Back to Discover</Link>} />;

  const from = sp.get("from") ?? "";
  const until = sp.get("until") ?? "";
  const hasDates = !!from && !!until && from <= until;
  const owner = userById(item.ownerId);
  const mine = item.ownerId === me.id;
  const m = matchFor(item, { category: item.category, from: hasDates ? from : undefined, until: hasDates ? until : undefined });
  const ownerSummary = summarizeTrust(state.trustEvents.filter((e) => e.userId === owner.id));
  const reserved = state.requests.filter((r) => r.itemId === item.id && LOCKING.has(r.status) && r.until >= today).sort((a, b) => a.from.localeCompare(b.from));
  const unavailable = !item.active || (hasDates && !m.eligible);
  const alts = alternativesFor(item, hasDates ? from : today, hasDates ? until : today, me, 3);
  const similar = state.items.filter((i) => i.id !== item.id && i.active && i.category === item.category).slice(0, 3);
  const rentable = canRent(item);
  const buyable = canSell(item);
  const myOpen = state.requests.find((r) => r.itemId === item.id && r.borrowerId === me.id && ["pending", "waitlisted", "approved", "active"].includes(r.status));

  return (
    <>
      <Link href="/discover" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden />Discover</Link>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <div className="relative"><ItemThumb item={item} className="h-64 sm:h-80" />{item.refurb && <div className="absolute left-3 top-3"><RefurbBadge item={item} /></div>}</div>{photoCredit(item.photo) && <p className="-mt-3 text-[11px] text-mute">{photoCredit(item.photo)}</p>}
          <PageHeader title={item.title} subtitle={item.description}
            actions={mine ? <Link className="btn-primary" href="/listings">Manage listing</Link> : rentable ? <button className="btn-primary" disabled={!!myOpen || !item.active} onClick={() => setReq(true)}>{myOpen ? "Request in progress" : unavailable && item.active ? "Request or join waitlist" : "Request to borrow"}</button> : undefined} />
          <div className="flex flex-wrap items-center gap-2">{rentable && <span className="rounded-full bg-navy px-3 py-1 text-sm font-bold text-white">{perDay(item.pricePerDay)}</span>}{(item.mode ?? "rent") !== "rent" && <span className="rounded-full bg-emerald-700 px-3 py-1 text-sm font-bold text-white">{rentable ? "Or buy " : "Buy "}₹{Math.round(item.salePrice ?? 0).toLocaleString("en-IN")}</span>}{item.sold && <Badge tone="red">Sold</Badge>}<Badge tone="cyan">{item.category}</Badge><Badge tone="gray">{item.condition}</Badge>{!item.active && <Badge tone="red">Paused by owner</Badge>}</div>
          {item.refurb && (
            <section className="card border-emerald-200 p-4" aria-labelledby="refurb"><h2 id="refurb" className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800"><BadgeCheck className="h-4 w-4" aria-hidden />Refurbished · Grade {item.refurb.grade} ({gradeText(item.refurb.grade)})</h2>
              <p className="text-sm text-ink"><b>What was done:</b> {item.refurb.work}</p>
              <p className="mt-1 text-sm text-ink"><b>Warranty:</b> {item.refurb.warrantyMonths > 0 ? `${item.refurb.warrantyMonths} month${item.refurb.warrantyMonths > 1 ? "s" : ""} from the seller` : "None. Sold as seen."}</p>
              <p className="mt-2 text-xs text-mute">Grades are set by the seller, not verified by RELO. Inspect the item before you pay.</p></section>)}
          {rentable && <><section className="card p-4"><h2 className="mb-2 text-sm font-semibold text-navy">Lending requirements</h2>
            {item.requirements.length ? <ul className="flex flex-wrap gap-2">{item.requirements.map((r) => <li key={r}><Badge tone="gray">{r}</Badge></li>)}</ul> : <p className="text-sm text-mute">The owner has no special requirements.</p>}</section>
          <section className="card p-4"><h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-navy"><CalendarCheck className="h-4 w-4" aria-hidden />Availability</h2>
            <p className="text-sm text-mute">Shared {fmtRange(item.availableFrom, item.availableUntil)}.</p>
            {reserved.length ? <><p className="mb-1.5 mt-3 text-xs font-semibold text-ink">Locked dates (approved or borrowed)</p><div className="flex flex-wrap gap-1.5">{reserved.map((r) => <Badge key={r.id} tone="gray">{fmtRange(r.from, r.until)}</Badge>)}</div></> : <p className="mt-2 text-sm text-emerald-800">No reservations right now.</p>}
          </section></>}
        </div>

        <aside className="space-y-5">
          <section className="card p-4" aria-labelledby="why">
            <div className="mb-3 flex items-center justify-between"><h2 id="why" className="text-sm font-semibold text-navy">Why {m.score}% match{hasDates ? " for your dates" : ""}</h2><span className="rounded-full bg-navy px-2.5 py-0.5 text-sm font-bold text-cyan">{m.score}%</span></div>
            <MatchBreakdown match={m} />
            {!hasDates && <p className="mt-3 text-xs text-mute">Pick dates in Discover (“Free for my dates”) to score availability exactly.</p>}
          </section>
          <section className="card p-4">
            <div className="flex items-center gap-3"><Avatar name={owner.name} size={40} /><div><p className="text-sm font-semibold text-navy">{mine ? "You" : owner.name}</p><p className="flex items-center gap-1 text-xs text-mute"><MapPin className="h-3 w-3" aria-hidden />{item.areaLabel} (approx.) · {m.distanceKm.toFixed(1)} km</p></div></div>
            <p className="mt-3 flex items-center gap-1.5 text-sm"><ShieldCheck className="h-4 w-4 text-[#0E8FC4]" aria-hidden /><b className="text-navy">{ownerSummary.score}</b> <span className="text-mute">{ownerSummary.level} · {ownerSummary.lends} lend{ownerSummary.lends === 1 ? "" : "s"} · {ownerSummary.lateReturns} late return{ownerSummary.lateReturns === 1 ? "" : "s"} as a borrower</span></p>
            <Link href="/trust" className="mt-2 inline-block text-xs font-semibold text-navy-600 hover:underline">How trust is calculated</Link>
            {!mine && !item.id.startsWith("s-") && rentable && <Link href={`/messages?t=${encodeURIComponent(threadIdOf(item.id, me.id))}`} className="btn-accent mt-4 w-full"><MessageSquare className="h-4 w-4" aria-hidden />Message owner · negotiate rent</Link>}
            {!mine && !item.id.startsWith("s-") && buyable && <Link href={`/messages?t=${encodeURIComponent(threadIdOf(item.id, me.id, "buy"))}`} className="btn-primary mt-3 w-full"><ShoppingBag className="h-4 w-4" aria-hidden />Make an offer to buy</Link>}
            {!mine && buyable && <p className="mt-2 text-xs text-mute">RELO doesn’t take payments. Agree a price in chat, inspect the item, then pay the owner directly.</p>}
          </section>
        </aside>
      </div>

      {rentable && (unavailable || alts.length > 0) && !mine && (
        <section className="mt-10" aria-labelledby="alts">
          <h2 id="alts" className="text-lg font-semibold text-navy">{unavailable ? "Not free? Next-best alternatives" : "Recommended alternatives"}</h2>
          <p className="mb-3 text-sm text-mute">{unavailable ? "Chosen by category, distance, date fit and requirements so you're never stuck." : "Similar items nearby that are free for the same period."}</p>
          {alts.length === 0 ? <EmptyState title="No free alternatives for these dates" body="Post a need so owners can offer something, or try different dates." action={<Link className="btn-primary" href="/requests">Post a need</Link>} /> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{alts.map((a) => <div key={a.item.id}><ItemCard item={a.item} ownerName={userById(a.item.ownerId).name} trust={trust(a.item.ownerId)} match={a.match} status={{ label: "Free for these dates", tone: "green" }} href={`/discover/${a.item.id}${hasDates ? `?from=${from}&until=${until}` : ""}`} /><p className="mt-1.5 px-1 text-xs text-mute">{a.reason}</p></div>)}</div>
          )}
        </section>
      )}
      {!unavailable && similar.length > 0 && alts.length === 0 && (
        <section className="mt-10"><h2 className="mb-3 text-lg font-semibold text-navy">Similar items</h2><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{similar.map((s) => <ItemCard key={s.id} item={s} ownerName={userById(s.ownerId).name} trust={trust(s.ownerId)} match={matchFor(s)} status={{ label: "Available", tone: "green" }} href={`/discover/${s.id}`} />)}</div></section>
      )}
      {!mine && rentable && <RequestDialog item={item} open={req} onClose={() => setReq(false)} defaults={hasDates ? { from, until } : undefined} />}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<Spinner />}><Detail /></Suspense>;
}
