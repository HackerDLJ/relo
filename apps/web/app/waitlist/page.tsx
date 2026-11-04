"use client";

import Link from "next/link";
import { useState } from "react";
import { Hourglass } from "lucide-react";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/derive";
import { Avatar, Badge, EmptyState, PageHeader, ScoreBar, Segmented, fmtRange } from "@/components/ui";

export default function WaitlistPage() {
  const { state, me } = useStore();
  const { itemById, userById, rankFor } = useDerived();
  const [tab, setTab] = useState<"me" | "mine">("me");

  const queueFor = (itemId: string) => {
    const item = itemById(itemId)!;
    return rankFor(item, state.requests.filter((r) => r.itemId === itemId && r.status === "waitlisted"));
  };
  const waiting = state.requests.filter((r) => r.borrowerId === me.id && r.status === "waitlisted");
  const myItemIds = state.items.filter((i) => i.ownerId === me.id).map((i) => i.id);
  const forMine = myItemIds.filter((id) => state.requests.some((r) => r.itemId === id && r.status === "waitlisted"));

  return (
    <>
      <PageHeader eyebrow="Fair allocation" title="Waitlist" subtitle="When dates are already reserved, requests queue fairly. Position comes from the same transparent priority score owners see, not just who clicked first." />
      <div className="mb-5"><Segmented label="Waitlist view" value={tab} onChange={setTab} options={[{ value: "me", label: `I'm waiting (${waiting.length})` }, { value: "mine", label: `Waiting for my items (${forMine.length})` }]} /></div>

      {tab === "me" && (waiting.length === 0 ? <EmptyState title="You're not on any waitlists" body="If you request dates that are already reserved, you can join the waitlist and we'll tell you the moment they free up." action={<Link className="btn-primary" href="/discover">Discover items</Link>} /> : (
        <ul className="space-y-4">{waiting.map((r) => {
          const item = itemById(r.itemId)!;
          const q = queueFor(r.itemId);
          const mineRank = q.find((x) => x.request.id === r.id)!;
          const blocker = state.requests.find((x) => x.itemId === r.itemId && (x.status === "approved" || x.status === "active") && x.from <= r.until && r.from <= x.until);
          return (
            <li key={r.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><Link href={`/discover/${item.id}`} className="text-base font-semibold text-navy hover:underline">{item.title}</Link><p className="text-xs text-mute">{userById(item.ownerId).name} · you asked for {fmtRange(r.from, r.until)}</p></div>
                <div className="flex items-center gap-2"><Hourglass className="h-4 w-4 text-navy-600" aria-hidden /><Badge tone="cyan">Position {mineRank.rank} of {q.length}</Badge></div></div>
              {blocker && <p className="mt-2 text-xs text-mute">Currently reserved {fmtRange(blocker.from, blocker.until)}{blocker.status === "active" ? " (borrowed now)" : ""}. You'll be told if it frees up (a cancellation, a decline or an early return).</p>}
              <p className="mt-3 text-sm text-ink">{mineRank.why}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">{mineRank.priority.parts.map((p) => <ScoreBar key={p.key} label={p.label} value={p.points} max={p.max} detail={p.detail} />)}</div>
              {q.length > 1 && <div className="mt-4 border-t border-line pt-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy-600">The queue</p><ol className="space-y-1.5 text-sm">{q.map((x) => <li key={x.request.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${x.request.id === r.id ? "bg-cyan-soft font-semibold" : ""}`}><span className="w-5 text-xs text-mute">{x.rank}.</span><Avatar name={userById(x.request.borrowerId).name} size={22} />{x.request.id === r.id ? "You" : userById(x.request.borrowerId).name}<span className="ml-auto text-xs tabular-nums text-mute">{x.priority.total}/100</span></li>)}</ol></div>}
            </li>);
        })}</ul>))}

      {tab === "mine" && (forMine.length === 0 ? <EmptyState title="Nobody is waitlisted on your items" body="When two people want the same dates and you approve one, the other waits here, in fair order." /> : (
        <ul className="space-y-4">{forMine.map((id) => {
          const item = itemById(id)!;
          const q = queueFor(id);
          return (
            <li key={id} className="card p-4 sm:p-5"><h2 className="text-base font-semibold text-navy">{item.title}</h2><p className="text-xs text-mute">{q.length} waiting</p>
              <ol className="mt-3 space-y-2">{q.map((x) => <li key={x.request.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-paper p-3 text-sm"><span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold">{x.rank}</span><Avatar name={userById(x.request.borrowerId).name} size={28} /><div className="min-w-0 flex-1"><p className="font-semibold text-navy">{userById(x.request.borrowerId).name}</p><p className="text-xs text-mute">{fmtRange(x.request.from, x.request.until)} · {x.why}</p></div><span className="rounded-full bg-navy px-2 py-0.5 text-xs font-bold text-cyan">{x.priority.total}</span></li>)}</ol>
              <p className="mt-3 text-xs text-mute">If the blocking loan is cancelled, returned early or declined, everyone here returns to <Link className="underline" href="/listings">My Listings</Link> for review.</p></li>);
        })}</ul>))}
    </>
  );
}
