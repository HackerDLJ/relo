"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, Check, X } from "lucide-react";
import { overdueStatus, STAGE_ORDER, type BorrowRequest, type Settings } from "@relo/core/engine";
import { useAct, useStore } from "@/lib/store";
import { useDerived } from "@/lib/derive";
import { Badge, EmptyState, Field, PageHeader, SimBadge, fmtDate, fmtRange } from "@/components/ui";
import { DueBadge, ExtensionDialog, ReturnDialog, STAGE_TONE } from "@/components/loan-bits";

const LADDER: { key: string; title: string; text: (s: Settings) => string }[] = [
  { key: "reminder", title: "Reminder", text: (s) => `${s.reminderDaysBefore} days before the due date, and on the day` },
  { key: "notice", title: "Overdue notice", text: () => "Day 1 late: borrower and owner told, waitlisted people warned" },
  { key: "warning", title: "Final warning", text: (s) => `Day ${s.warningAfterDays}: trust penalty accrues daily` },
  { key: "escalated", title: "Escalation", text: (s) => `Day ${s.escalationAfterDays}: moderators flagged, extra −10 trust` },
  { key: "suspended", title: "Suspension", text: (s) => `Day ${s.suspendAfterDays}: new borrowing paused until returned` },
];

export default function ReturnsPage() {
  const { state, me, today } = useStore();
  const { actions } = useStore();
  const act = useAct();
  const { itemById, userById } = useDerived();
  const [ext, setExt] = useState<BorrowRequest | null>(null);
  const [ret, setRet] = useState<BorrowRequest | null>(null);
  const [draft, setDraft] = useState<Record<keyof Settings, string>>({} as Record<keyof Settings, string>);
  useEffect(() => { setDraft(Object.fromEntries(Object.entries(state.settings).map(([k, v]) => [k, String(v)])) as Record<keyof Settings, string>); }, [state.settings]);

  const loans = state.requests.filter((r) => r.status === "active" && (r.borrowerId === me.id || itemById(r.itemId)?.ownerId === me.id))
    .map((r) => ({ r, s: overdueStatus(r, today, state.settings) })).sort((a, b) => a.s.daysLeft - b.s.daysLeft);
  const extensions = loans.filter(({ r }) => r.extension?.status === "pending" && itemById(r.itemId)?.ownerId === me.id);
  const save = () => act(() => actions.updateSettings(Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, Number(v)])) as Partial<Settings>));
  const fields: { key: keyof Settings; label: string; hint: string }[] = [
    { key: "reminderDaysBefore", label: "Reminder lead time (days)", hint: "How early reminders start" },
    { key: "graceDays", label: "Grace period (days)", hint: "Late days before any penalty" },
    { key: "trustPenaltyPerDay", label: "Penalty per late day", hint: "Trust points, on top of a base 5" },
    { key: "maxTrustPenalty", label: "Maximum late penalty", hint: "Cap, up to 50" },
    { key: "warningAfterDays", label: "Final warning after (days)", hint: "Days late" },
    { key: "escalationAfterDays", label: "Escalate after (days)", hint: "Days late" },
    { key: "suspendAfterDays", label: "Suspend after (days)", hint: "Days late" },
  ];

  return (
    <>
      <PageHeader eyebrow="Reminders · extensions · penalties · escalation" title="Returns & Overdue" subtitle="Everything due back, with automatic reminders, owner-approved extensions, transparent penalties and a clear escalation ladder." />

      {extensions.length > 0 && (
        <section className="mb-8" aria-labelledby="ext"><h2 id="ext" className="mb-3 text-lg font-semibold text-navy">Extension requests to decide</h2>
          <ul className="space-y-3">{extensions.map(({ r }) => <li key={r.id} className="card flex flex-wrap items-center gap-3 p-4"><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-navy">{userById(r.borrowerId).name} · {itemById(r.itemId)!.title}</p><p className="text-xs text-mute">Due {fmtDate(r.until)}, asks until {fmtDate(r.extension!.requestedUntil)}: “{r.extension!.reason}”</p></div>
            <button className="btn-primary btn-sm" onClick={() => act(() => actions.resolveExtension(r.id, true))}><Check className="h-3.5 w-3.5" aria-hidden />Approve</button><button className="btn-danger btn-sm" onClick={() => act(() => actions.resolveExtension(r.id, false))}><X className="h-3.5 w-3.5" aria-hidden />Decline</button></li>)}</ul></section>)}

      <section aria-labelledby="due"><h2 id="due" className="mb-3 text-lg font-semibold text-navy">Due back</h2>
        {loans.length === 0 ? <EmptyState title="Nothing is due back" body="Active loans, borrowed or lent, show up here with their reminder and overdue stage." action={<Link className="btn-primary" href="/discover">Discover items</Link>} /> : (
          <ul className="space-y-4">{loans.map(({ r, s }) => {
            const item = itemById(r.itemId)!;
            const iOwn = item.ownerId === me.id;
            const stageIdx = LADDER.findIndex((l) => l.key === s.stage);
            return (
              <li key={r.id} className={`card p-4 sm:p-5 ${s.daysLate > 0 ? "border-red-200" : ""}`}>
                <div className="flex flex-wrap items-start gap-3"><div className="min-w-0 flex-1"><p className="text-base font-semibold text-navy">{item.title}</p><p className="text-xs text-mute">{iOwn ? `Borrowed by ${userById(r.borrowerId).name}` : `From ${userById(item.ownerId).name}`} · {fmtRange(r.from, r.until)}</p></div><DueBadge r={r} /></div>
                <p className="mt-2 text-sm text-ink">{s.action}</p>
                {s.daysLate > 0 && <p className="mt-1 text-xs text-red-800">If returned today: trust −{s.projectedPenalty}. {s.stage === "escalated" || s.stage === "suspended" ? "An extra −10 escalation penalty already applied." : ""}</p>}
                <ol className="mt-3 grid grid-cols-5 gap-1.5" aria-label="Escalation stage">{LADDER.map((l, i) => <li key={l.key} className={`rounded-lg px-1.5 py-1.5 text-center text-[10px] font-semibold leading-tight sm:text-[11px] ${i <= stageIdx && s.stage !== "upcoming" && s.stage !== "due_today" ? (i >= 1 ? "bg-red-50 text-red-800" : "bg-cyan-soft text-navy-700") : "bg-paper text-mute"}`}>{l.title}</li>)}</ol>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!iOwn && <><button className="btn-ghost btn-sm" disabled={r.extension?.status === "pending"} onClick={() => setExt(r)}>{r.extension?.status === "pending" ? "Extension pending" : "Request extension"}</button><button className="btn-primary btn-sm" onClick={() => act(() => actions.notifyReturned(r.id))}>I've returned it</button></>}
                  {iOwn && <><button className="btn-primary btn-sm" onClick={() => setRet(r)}>Confirm return</button>{r.extension?.status === "pending" && <><button className="btn-accent btn-sm" onClick={() => act(() => actions.resolveExtension(r.id, true))}>Approve extension</button><button className="btn-ghost btn-sm" onClick={() => act(() => actions.resolveExtension(r.id, false))}>Decline extension</button></>}</>}
                </div>
              </li>);
          })}</ul>)}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2" aria-label="Rules">
        <div className="card p-5"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-lg font-semibold text-navy">Late-return rules</h2><Badge tone="gray">Applies to all members</Badge></div>
          <p className="mb-4 text-sm text-mute">Penalty = 5 + penalty-per-day × late days after grace, capped. Change a rule and every loan is re-evaluated.</p>
          <div className="grid gap-3 sm:grid-cols-2">{fields.map((f) => <Field key={f.key} label={f.label} hint={f.hint}>{(id) => <input id={id} inputMode="numeric" className="input" value={draft[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value.replace(/[^\d]/g, "") })} />}</Field>)}</div>
          <div className="mt-4 flex gap-2"><button className="btn-primary" onClick={save}>Save rules</button><button className="btn-ghost" onClick={() => act(() => actions.updateSettings({ graceDays: 0, trustPenaltyPerDay: 2, maxTrustPenalty: 20, reminderDaysBefore: 2, warningAfterDays: 3, escalationAfterDays: 7, suspendAfterDays: 14 }))}>Restore defaults</button></div></div>
        <div className="card p-5"><h2 className="mb-3 text-lg font-semibold text-navy">Escalation ladder</h2>
          <ol className="space-y-3">{LADDER.map((l, i) => <li key={l.key} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy text-xs font-bold text-cyan">{i + 1}</span><div><p className="text-sm font-semibold text-navy">{l.title}</p><p className="text-xs text-mute">{l.text(state.settings)}</p></div></li>)}</ol>
          <p className="mt-4 text-xs text-mute">When an item comes back, everyone waitlisted for it is notified and returned to the owner's review queue.</p></div>
      </section>

      <section className="card mt-6 p-5" aria-labelledby="sim"><h2 id="sim" className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy"><BellRing className="h-5 w-5" aria-hidden />What's real and what's simulated</h2>
        <div className="grid gap-4 md:grid-cols-2 text-sm"><div><p className="mb-1.5 font-semibold text-emerald-800">Operational in this prototype</p><ul className="list-disc space-y-1 pl-5 text-mute"><li>Stage calculation from due dates and your rules</li><li>Trust penalties, escalation deductions and suspension</li><li>Extension requests, approval and rejection with conflict checks</li><li>Return confirmation, trust updates and waitlist reopening</li></ul></div>
          <div><p className="mb-1.5 flex items-center gap-2 font-semibold text-navy-700">Simulated <SimBadge /></p><ul className="list-disc space-y-1 pl-5 text-mute"><li>Reminders and alerts appear in the in-app bell only. No email, SMS or push is sent.</li><li>“Community moderators” are not real people.</li><li>The demo clock (Profile & Settings) fast-forwards time so you can see overdue flows.</li></ul></div></div></section>

      <ExtensionDialog r={ext} onClose={() => setExt(null)} />
      <ReturnDialog r={ret} onClose={() => setRet(null)} />
      {void STAGE_ORDER}{void STAGE_TONE}
    </>
  );
}
