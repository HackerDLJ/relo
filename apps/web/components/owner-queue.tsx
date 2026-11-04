"use client";

import { useState } from "react";
import { ChevronDown, Clock, Trophy } from "lucide-react";
import type { Item } from "@relo/core/engine";
import { useAct, useStore } from "@/lib/store";
import { useDerived } from "@/lib/derive";
import { Avatar, Badge, Field, Modal, ScoreBar, fmtRange, ago } from "./ui";
import Link from "next/link";
import { threadIdOf, perDay } from "@/lib/chat";
import { STATUS_LABEL, STATUS_TONE } from "./item-bits";

/** Ranked, explainable queue of competing requests for one item. */
export function OwnerQueue({ item }: { item: Item }) {
  const { state } = useStore();
  const act = useAct();
  const { actions } = useStore();
  const { rankFor, userById } = useDerived();
  const [open, setOpen] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const reviewable = state.requests.filter((r) => r.itemId === item.id && (r.status === "pending" || r.status === "waitlisted"));
  const ranked = rankFor(item, reviewable);
  if (!ranked.length) return <p className="rounded-xl bg-paper p-3 text-sm text-mute">No requests waiting on this item.</p>;
  const competing = ranked.length > 1;

  return (
    <div className="space-y-2.5">
      {competing && <p className="flex items-start gap-2 rounded-xl bg-cyan-soft p-3 text-xs leading-relaxed text-navy-700"><Trophy className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />{ranked.length} requests are competing. They're ranked by match (30), trust (25), urgency (20), submission time (10), past successful borrowing (8) and a fairness boost for past declines (7). Approving one locks its dates and moves clashing requests to the waitlist.</p>}
      {ranked.map(({ request: r, priority, rank, why }) => {
        const b = userById(r.borrowerId);
        const isOpen = open === r.id;
        return (
          <div key={r.id} className="rounded-xl border border-line bg-white">
            <div className="flex flex-wrap items-center gap-3 p-3">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${rank === 1 ? "bg-cyan text-navy" : "bg-paper text-mute"}`} aria-label={`Rank ${rank}`}>{rank}</span>
              <Avatar name={b.name} size={32} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-navy">{b.name} <span className="font-normal text-mute">· {fmtRange(r.from, r.until)}</span></p>
                <p className="truncate text-xs text-mute">“{r.purpose}” · {ago(r.submittedAt)} · {perDay(r.pricePerDay)}</p>
              </div>
              <div className="flex items-center gap-2"><Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge><span className="rounded-full bg-navy px-2 py-0.5 text-xs font-bold tabular-nums text-cyan" title="Priority score out of 100">{priority.total}</span></div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
              <button className="btn-primary btn-sm" onClick={() => act(() => actions.decideRequest(r.id, "approve"))}>Approve</button>
              {r.status === "pending" && <button className="btn-ghost btn-sm" onClick={() => act(() => actions.decideRequest(r.id, "waitlist"))}><Clock className="h-3.5 w-3.5" aria-hidden />Waitlist</button>}
              <button className="btn-danger btn-sm" onClick={() => { setDeclining(r.id); setReason(""); }}>Decline</button>
              <Link href={`/messages?t=${encodeURIComponent(threadIdOf(r.itemId, r.borrowerId))}`} className="btn-ghost btn-sm">Message</Link>
              <button onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-navy-600 hover:underline">Why this rank?<ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden /></button>
            </div>
            {isOpen && (
              <div className="space-y-3 border-t border-line bg-paper/60 p-3">
                <p className="text-xs text-ink">{why}</p>
                <div className="grid gap-3 sm:grid-cols-2">{priority.parts.map((p) => <ScoreBar key={p.key} label={p.label} value={p.points} max={p.max} detail={p.detail} />)}</div>
              </div>
            )}
          </div>
        );
      })}
      <Modal open={!!declining} onClose={() => setDeclining(null)} title="Decline this request"
        footer={<><button className="btn-ghost" onClick={() => setDeclining(null)}>Keep reviewing</button><button className="btn-danger" onClick={() => { if (declining) act(() => actions.decideRequest(declining, "decline", reason)); setDeclining(null); }}>Decline request</button></>}>
        <Field label="Reason (shown to the borrower)" hint="The borrower is automatically shown next-best alternatives.">{(id) => <textarea id={id} rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Needed by family that week" />}</Field>
      </Modal>
    </div>
  );
}
