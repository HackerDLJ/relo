"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BadgeIndianRupee, Check, Lock, Send, X } from "lucide-react";
import type { Item, Message } from "@relo/core/engine";
import { useAct, useStore } from "@/lib/store";
import { dealState, money, threadIdOf, type DealKind } from "@/lib/chat";
import { canSell } from "@relo/core/engine";
import { Avatar } from "./ui";
import { ItemThumb } from "./item-bits";

const clock = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Private conversation between one item's owner and one borrower, with price offers. */
export function Thread({ item, borrowerId, kind = "rent", onBack }: { item: Item; borrowerId: string; kind?: DealKind; onBack?: () => void }) {
  const { state, me, actions, refresh } = useStore();
  const act = useAct();
  const threadId = threadIdOf(item.id, borrowerId, kind);
  const buy = kind === "buy";
  const msgs = useMemo(() => state.messages.filter((m) => m.threadId === threadId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [state.messages, threadId]);
  const deal = dealState(msgs);
  const owner = state.users.find((u) => u.id === item.ownerId);
  const borrower = state.users.find((u) => u.id === borrowerId);
  const other = me.id === item.ownerId ? borrower : owner;
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"text" | "offer">("text");
  const [price, setPrice] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Mark read as messages arrive, and poll faster while a chat is open.
  useEffect(() => { actions.markThreadRead(threadId); }, [msgs.length, threadId, actions]);
  useEffect(() => { const t = window.setInterval(() => { void refresh(); }, 5000); return () => window.clearInterval(t); }, [refresh]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  const listed = (buy ? item.salePrice : item.pricePerDay) ?? 0;
  const m$ = (n?: number) => money(n, kind);
  const incoming = deal.pending && deal.pending.fromId !== me.id ? deal.pending : undefined;
  const waiting = deal.pending && deal.pending.fromId === me.id ? deal.pending : undefined;
  const quick = listed > 0 ? [Math.round(listed * 0.9), Math.round(listed * 0.8), Math.round(listed * 0.7)] : [];

  function submit(e: FormEvent) {
    e.preventDefault();
    const r = mode === "offer"
      ? act(() => actions.sendMessage({ itemId: item.id, borrowerId, deal: kind, kind: "offer", price: Number(price), body: text }))
      : act(() => actions.sendMessage({ itemId: item.id, borrowerId, deal: kind, kind: "text", body: text }));
    if (r.ok) { setText(""); if (mode === "offer") { setPrice(""); setMode("text"); } }
  }

  return (
    <div className="card flex h-[calc(100dvh-20rem)] min-h-[420px] flex-col overflow-hidden md:h-[calc(100dvh-16.5rem)]">
      <header className="flex items-center gap-3 border-b border-line p-3">
        {onBack && <button className="btn-ghost btn-sm md:hidden" onClick={onBack}>Back</button>}
        <div className="w-12 shrink-0"><ItemThumb item={item} className="h-12" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-navy">{item.title}</p>
          <p className="truncate text-xs text-mute">With {other?.name ?? "neighbour"} · {buy ? "For sale" : "Listed"} {m$(listed)}</p>
        </div>
        <span className="hidden items-center gap-1 rounded-full bg-cyan-soft px-2.5 py-1 text-[11px] font-semibold text-navy-700 sm:inline-flex"><Lock className="h-3 w-3" aria-hidden />Private</span>
      </header>

      {deal.agreed !== undefined && (
        <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900"><Check className="h-4 w-4" aria-hidden />Agreed price: {m$(deal.agreed)}{buy ? (item.sold ? " · sold" : me.id === item.ownerId ? "" : " · meet the owner to inspect and pay directly") : me.id !== item.ownerId && " · send your request to lock the dates"}
          {buy && me.id === item.ownerId && !item.sold && canSell(item) && <button className="btn-primary btn-sm ml-auto" onClick={() => act(() => actions.markSold(item.id, borrowerId, deal.agreed as number))}>Mark as sold</button>}</div>
      )}

      <div className="flex-1 space-y-2.5 overflow-y-auto bg-paper/60 p-4" role="log" aria-live="polite" aria-label="Messages">
        {msgs.length === 0 && (
          <p className="mx-auto mt-8 max-w-xs text-center text-sm text-mute">
            {me.id === item.ownerId ? "No messages yet." : `Say hello to ${owner?.name ?? "the owner"} or ${buy ? "make an offer" : "propose a price"}. Only the two of you can see this chat.`}
          </p>
        )}
        {msgs.map((m) => <Bubble key={m.id} m={m} mine={m.fromId === me.id} kind={kind} />)}
        <div ref={endRef} />
      </div>

      {incoming && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-white p-3">
          <p className="mr-auto text-sm text-ink"><b>{other?.name.split(" ")[0]}</b> offers <b>{m$(incoming.price)}</b></p>
          <button className="btn-primary btn-sm" onClick={() => act(() => actions.sendMessage({ itemId: item.id, borrowerId, deal: kind, kind: "accept" }))}><Check className="h-3.5 w-3.5" aria-hidden />Accept</button>
          <button className="btn-ghost btn-sm" onClick={() => { setMode("offer"); setPrice(String(Math.round(((incoming.price ?? 0) + listed) / 2))); }}>Counter</button>
          <button className="btn-danger btn-sm" onClick={() => act(() => actions.sendMessage({ itemId: item.id, borrowerId, deal: kind, kind: "decline" }))}><X className="h-3.5 w-3.5" aria-hidden />Decline</button>
        </div>
      )}
      {waiting && !incoming && <p className="border-t border-line bg-white px-4 py-2 text-xs text-mute">Waiting for {other?.name.split(" ")[0]} to answer your offer of {m$(waiting.price)}.</p>}

      <form onSubmit={submit} className="space-y-2 border-t border-line bg-white p-3">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <button type="button" aria-pressed={mode === "text"} onClick={() => setMode("text")} className={`rounded-full px-3 py-1 ${mode === "text" ? "bg-navy text-white" : "bg-paper text-mute"}`}>Message</button>
          <button type="button" aria-pressed={mode === "offer"} onClick={() => setMode("offer")} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${mode === "offer" ? "bg-navy text-white" : "bg-paper text-mute"}`}><BadgeIndianRupee className="h-3.5 w-3.5" aria-hidden />Price offer</button>
          {mode === "offer" && quick.length > 0 && <span className="ml-auto flex gap-1.5">{quick.map((q, i) => <button type="button" key={q} onClick={() => setPrice(String(q))} className="rounded-full border border-line bg-white px-2 py-1 text-mute hover:bg-paper">₹{q} <span className="opacity-60">−{(i + 1) * 10}%</span></button>)}</span>}
        </div>
        <div className="flex items-end gap-2">
          {mode === "offer" && (
            <label className="w-28 shrink-0"><span className="sr-only">{buy ? "Price in rupees" : "Price per day in rupees"}</span>
              <div className="flex items-center rounded-xl border border-line bg-white pl-3 focus-within:ring-2 focus-within:ring-cyan/40"><span className="text-sm text-mute">₹</span>
                <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder={buy ? "total" : "/day"} className="w-full bg-transparent px-2 py-2.5 text-sm text-ink focus:outline-none" /></div>
            </label>
          )}
          <textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={mode === "offer" ? "Add a note (optional)" : "Write a message…"}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
            className="input max-h-28 min-h-[42px] flex-1 resize-none" aria-label="Message" />
          <button className="btn-primary h-[42px] px-4" aria-label={mode === "offer" ? "Send offer" : "Send message"}><Send className="h-4 w-4" aria-hidden /></button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ m, mine, kind }: { m: Message; mine: boolean; kind: DealKind }) {
  const perDay = (n?: number) => money(n, kind);
  if (m.kind === "accept" || m.kind === "decline") {
    return <p className="mx-auto w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-mute shadow-card">{mine ? "You" : "They"} {m.kind === "accept" ? `accepted ${perDay(m.price)}` : "declined the offer"} · {clock(m.createdAt)}</p>;
  }
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm shadow-card ${mine ? "rounded-br-md bg-navy text-white" : "rounded-bl-md bg-white text-ink"}`}>
        {m.kind === "offer" && <p className={`mb-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${mine ? "bg-cyan text-navy" : "bg-cyan-soft text-navy-700"}`}><BadgeIndianRupee className="h-3.5 w-3.5" aria-hidden />Offer {perDay(m.price)}</p>}
        {m.body && <p className="whitespace-pre-wrap break-words leading-snug">{m.body}</p>}
        <p className={`mt-1 text-[10.5px] ${mine ? "text-white/60" : "text-mute"}`}>{clock(m.createdAt)}</p>
      </div>
    </div>
  );
}

export function ThreadAvatar({ name }: { name: string }) { return <Avatar name={name} size={36} />; }
