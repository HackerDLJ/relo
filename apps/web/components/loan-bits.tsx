"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { daysBetween, latePenalty, overdueStatus, type BorrowRequest } from "@relo/core/engine";
import { useAct, useStore } from "@/lib/store";
import { Badge, Field, Modal, fmtDate } from "./ui";

export const STAGE_TONE = { upcoming: "gray", reminder: "cyan", due_today: "amber", notice: "amber", warning: "red", escalated: "red", suspended: "red" } as const;

export function DueBadge({ r }: { r: BorrowRequest }) {
  const { today, state } = useStore();
  const s = overdueStatus(r, today, state.settings);
  return <Badge tone={STAGE_TONE[s.stage]}>{s.label}{s.daysLate > 0 ? ` · ${s.daysLate}d late` : ""}</Badge>;
}

export function ReturnDialog({ r, onClose }: { r: BorrowRequest | null; onClose(): void }) {
  const { state, today, actions } = useStore();
  const act = useAct();
  const [stars, setStars] = useState(5);
  useEffect(() => { if (r) setStars(5); }, [r]);
  if (!r) return <Modal open={false} onClose={onClose} title="" children={null} />;
  const item = state.items.find((i) => i.id === r.itemId)!;
  const late = daysBetween(r.until, today);
  const borrower = state.users.find((u) => u.id === r.borrowerId)!;
  const effect = late > 0 ? `${borrower.name.split(" ")[0]}'s trust drops ${latePenalty(late, state.settings)} points (${late} day${late > 1 ? "s" : ""} late).` : late < 0 ? `${borrower.name.split(" ")[0]}'s trust rises 5 points for returning early.` : `${borrower.name.split(" ")[0]}'s trust rises 4 points for returning on time.`;
  return (
    <Modal open onClose={onClose} title="Confirm return"
      footer={<><button className="btn-ghost" onClick={onClose}>Not yet</button><button className="btn-primary" onClick={() => { const res = act(() => actions.confirmReturn(r.id, stars)); if (res.ok) onClose(); }}>Confirm item is back</button></>}>
      <div className="space-y-4 text-sm text-ink">
        <p>Confirm that <b>{item.title}</b> is back with you in the condition you expected.</p>
        <div className="rounded-xl bg-paper p-3"><p className="font-semibold text-navy">What happens next</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-mute"><li>{effect} You earn 3 trust points for completing a lend.</li><li>Dates free up and anyone waitlisted is notified (simulated notification).</li><li>Community impact estimates update.</li></ul></div>
        <Field label="Feedback for the borrower" hint="Stars feed the trust score: (stars − 3) × 2 points.">{() => (
          <div className="flex gap-1" role="radiogroup" aria-label="Star rating">{[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setStars(n)} className="rounded p-1"><Star className={`h-7 w-7 ${n <= stars ? "fill-cyan text-cyan" : "text-line"}`} /></button>))}</div>)}</Field>
      </div>
    </Modal>
  );
}

export function ExtensionDialog({ r, onClose }: { r: BorrowRequest | null; onClose(): void }) {
  const { state, actions } = useStore();
  const act = useAct();
  const [until, setUntil] = useState("");
  const [reason, setReason] = useState("");
  useEffect(() => { if (r) { setUntil(""); setReason(""); } }, [r]);
  if (!r) return <Modal open={false} onClose={onClose} title="" children={null} />;
  const item = state.items.find((i) => i.id === r.itemId)!;
  const max = new Date(`${r.until}T00:00:00Z`); max.setUTCDate(max.getUTCDate() + 7);
  return (
    <Modal open onClose={onClose} title="Request an extension"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => { const res = act(() => actions.requestExtension(r.id, until, reason)); if (res.ok) onClose(); }}>Send to owner</button></>}>
      <div className="space-y-4">
        <p className="text-sm text-mute"><b className="text-ink">{item.title}</b> is due {fmtDate(r.until)}. Extensions are up to 7 days and can't overlap a reserved loan.</p>
        <Field label="New return date">{(id) => <input id={id} type="date" className="input" min={r.until} max={max.toISOString().slice(0, 10)} value={until} onChange={(e) => setUntil(e.target.value)} />}</Field>
        <Field label="Reason">{(id) => <textarea id={id} rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why do you need a bit longer?" />}</Field>
      </div>
    </Modal>
  );
}
