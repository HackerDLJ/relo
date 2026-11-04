"use client";

import { ShieldCheck, Handshake, Undo2, Clock, Ban, Star } from "lucide-react";
import { summarizeTrust, TRUST_BASE, TRUST_RULES, MATCH_WEIGHTS, PRIORITY_WEIGHTS } from "@relo/core/engine";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/derive";
import { Avatar, Badge, PageHeader, Stat, fmtDate } from "@/components/ui";

export default function TrustPage() {
  const { state, me } = useStore();
  const { successfulBorrows } = useDerived();
  const t = summarizeTrust(state.trustEvents.filter((e) => e.userId === me.id));
  const events = state.trustEvents.filter((e) => e.userId === me.id).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const borrows = state.requests.filter((r) => r.borrowerId === me.id && (r.status === "returned" || r.status === "active")).length;
  const everyone = state.users.map((u) => ({ u, s: summarizeTrust(state.trustEvents.filter((e) => e.userId === u.id)) })).sort((a, b) => b.s.score - a.s.score);
  const r = 54, c = 2 * Math.PI * r;

  return (
    <>
      <PageHeader eyebrow="Transparent rules, not a black box" title="Trust & Reputation" subtitle="Your score starts at 50 and moves only by the published rules below. It feeds back into who is matched and who gets priority." />
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <section className="card flex flex-col items-center p-6 text-center" aria-label="Your trust score">
          <div className="relative h-36 w-36"><svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" role="img" aria-label={`Trust score ${t.score} out of 100`}><circle cx="64" cy="64" r={r} fill="none" stroke="#E3E8EE" strokeWidth="10" /><circle cx="64" cy="64" r={r} fill="none" stroke="#36BDF2" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - t.score / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} /></svg>
            <div className="absolute inset-0 grid place-items-center"><div><div className="text-4xl font-bold tabular-nums text-navy">{t.score}</div><div className="text-[11px] font-semibold uppercase tracking-wide text-mute">of 100</div></div></div></div>
          <p className="mt-3 text-base font-semibold text-navy">{t.level}</p>
          <p className="mt-1 text-xs text-mute">{me.name}</p>
          <div className="mt-4 w-full rounded-xl bg-paper p-3 text-left text-xs leading-relaxed text-mute"><p className="mb-1 font-semibold text-ink">Where trust is used</p><ul className="list-disc space-y-1 pl-4"><li>Owner trust is {MATCH_WEIGHTS.trust}% of an item's match score.</li><li>Borrower trust is {PRIORITY_WEIGHTS.trust}% of request priority.</li><li>A score under 40 is flagged to owners.</li></ul></div>
        </section>

        <div className="min-w-0 space-y-5">
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="Reputation stats">
            <Stat label="Successful returns" value={t.successfulReturns} icon={<Undo2 className="h-4 w-4" aria-hidden />} />
            <Stat label="Late returns" value={t.lateReturns} icon={<Clock className="h-4 w-4" aria-hidden />} />
            <Stat label="Cancellations" value={t.cancellations} icon={<Ban className="h-4 w-4" aria-hidden />} />
            <Stat label="Borrowing history" value={borrows} sub={`${successfulBorrows(me.id)} returned`} icon={<ShieldCheck className="h-4 w-4" aria-hidden />} />
            <Stat label="Lending history" value={t.lends} icon={<Handshake className="h-4 w-4" aria-hidden />} />
            <Stat label="Community feedback" value={t.feedbackAvg ? `${t.feedbackAvg} / 5` : "None yet"} sub={`${t.feedbackCount} review${t.feedbackCount === 1 ? "" : "s"}`} icon={<Star className="h-4 w-4" aria-hidden />} />
          </section>

          <section className="card overflow-hidden" aria-labelledby="rules"><div className="border-b border-line p-4"><h2 id="rules" className="text-base font-semibold text-navy">The rules</h2><p className="text-xs text-mute">Base score {TRUST_BASE}. Your totals so far in the right column. Late penalty is configurable in Returns & Overdue.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm"><thead className="bg-paper text-xs text-mute"><tr><th className="px-4 py-2 font-semibold">Event</th><th className="px-4 py-2 font-semibold">Rule</th><th className="px-4 py-2 text-right font-semibold">You</th></tr></thead>
              <tbody className="divide-y divide-line">{TRUST_RULES.map((rule) => { const k = t.byKind.find((b) => b.kind === rule.kind)!; return <tr key={rule.kind}><td className="px-4 py-2.5 font-medium text-navy">{rule.label}</td><td className="px-4 py-2.5 text-mute">{rule.rule}</td><td className="px-4 py-2.5 text-right tabular-nums">{k.count ? <span className={k.total >= 0 ? "text-emerald-800" : "text-red-800"}>{k.total > 0 ? "+" : ""}{k.total} <span className="text-mute">({k.count})</span></span> : <span className="text-mute">·</span>}</td></tr>; })}</tbody></table></div></section>

          <section className="card p-4" aria-labelledby="hist"><h2 id="hist" className="mb-3 text-base font-semibold text-navy">Your trust history</h2>
            {events.length === 0 ? <p className="text-sm text-mute">No events yet. Your first completed loan will appear here.</p> : <ul className="divide-y divide-line">{events.slice(0, 25).map((e) => <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm"><span className={`w-10 shrink-0 text-right font-bold tabular-nums ${e.delta >= 0 ? "text-emerald-800" : "text-red-800"}`}>{e.delta > 0 ? "+" : ""}{e.delta}</span><span className="min-w-0 flex-1 text-ink">{e.note}</span><span className="text-xs text-mute">{fmtDate(e.date)}</span></li>)}</ul>}</section>

          <section className="card p-4" aria-labelledby="comm"><h2 id="comm" className="mb-3 text-base font-semibold text-navy">Community trust</h2>
            <ul className="space-y-2">{everyone.map(({ u, s }) => <li key={u.id} className="flex items-center gap-3 text-sm"><Avatar name={u.name} size={28} /><span className="min-w-0 flex-1 truncate font-medium text-navy">{u.name}{u.id === me.id ? " (you)" : ""}</span><Badge tone={s.score >= 80 ? "green" : s.score >= 60 ? "cyan" : s.score >= 40 ? "amber" : "red"}>{s.level}</Badge><span className="w-8 text-right font-bold tabular-nums text-navy">{s.score}</span></li>)}</ul></section>
        </div>
      </div>
    </>
  );
}
