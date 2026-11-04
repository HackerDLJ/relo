"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useStore } from "@/lib/store";
import { parseThread, perDay, dealState } from "@/lib/chat";
import { Thread, ThreadAvatar } from "@/components/chat";
import { EmptyState, PageHeader, ago } from "@/components/ui";

export default function MessagesPage() {
  const { state, me } = useStore();
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => { const t = new URLSearchParams(window.location.search).get("t"); if (t) setSel(t); }, []);

  const threads = useMemo(() => {
    const ids = new Set(state.messages.filter((m) => m.fromId === me.id || m.toId === me.id).map((m) => m.threadId));
    if (sel) ids.add(sel);
    return [...ids].map((id) => {
      const { itemId, borrowerId } = parseThread(id);
      const item = state.items.find((i) => i.id === itemId);
      const msgs = state.messages.filter((m) => m.threadId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      return { id, item, borrowerId, msgs, last: msgs[msgs.length - 1], unread: msgs.filter((m) => m.toId === me.id && !m.readAt).length };
    }).filter((t) => t.item && (t.item.ownerId === me.id || t.borrowerId === me.id))
      .sort((a, b) => (b.last?.createdAt ?? "9").localeCompare(a.last?.createdAt ?? "9"));
  }, [state.messages, state.items, me.id, sel]);

  const current = threads.find((t) => t.id === sel);
  const nameOf = (t: (typeof threads)[number]) => state.users.find((u) => u.id === (t.item!.ownerId === me.id ? t.borrowerId : t.item!.ownerId))?.name ?? "Neighbour";

  return (
    <>
      <PageHeader title="Messages" subtitle="Private chats with owners and borrowers about price and pickup. Only the two of you can read them." />
      {threads.length === 0 ? (
        <EmptyState title="No conversations yet" body="Open any item and tap “Message owner” to ask a question or propose a lower price." action={<Link className="btn-primary" href="/discover">Browse items</Link>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <ul className={`card divide-y divide-line self-start overflow-hidden ${current ? "hidden md:block" : ""}`} aria-label="Conversations">
            {threads.map((t) => {
              const d = dealState(t.msgs);
              return (
                <li key={t.id}>
                  <button onClick={() => setSel(t.id)} aria-current={t.id === sel ? "true" : undefined} className={`flex w-full items-center gap-3 p-3 text-left hover:bg-paper ${t.id === sel ? "bg-cyan-soft" : ""}`}>
                    <ThreadAvatar name={nameOf(t)} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-navy"><span className="truncate">{nameOf(t)}</span>{t.unread > 0 && <span className="rounded-full bg-cyan px-1.5 text-[11px] font-bold text-navy">{t.unread}</span>}</p>
                      <p className="truncate text-xs text-mute">{t.item!.title}{d.agreed !== undefined ? ` · agreed ${perDay(d.agreed)}` : ""}</p>
                      <p className="truncate text-xs text-mute">{t.last ? `${t.last.fromId === me.id ? "You: " : ""}${t.last.kind === "offer" ? `Offer ${perDay(t.last.price)}` : t.last.kind === "accept" ? "Offer accepted" : t.last.kind === "decline" ? "Offer declined" : t.last.body}` : "New conversation"}</p>
                    </div>
                    {t.last && <span className="shrink-0 text-[11px] text-mute">{ago(t.last.createdAt)}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className={current ? "" : "hidden md:block"}>
            {current?.item ? <Thread key={current.id} item={current.item} borrowerId={current.borrowerId} onBack={() => setSel(null)} /> : (
              <div className="card hidden h-72 place-items-center text-center text-sm text-mute md:grid"><div><MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" aria-hidden />Select a conversation</div></div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
