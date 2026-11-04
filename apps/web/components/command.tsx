"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { useStore } from "@/lib/store";
import { NAV } from "./shell";
import { CategoryIcon } from "./item-bits";

type Hit = { id: string; label: string; hint: string; href: string; icon: React.ReactNode };

/** Quick jump: pages and items. Opens with Ctrl/Cmd+K or "/", or from the header button. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose(): void }) {
  const { state } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => input.current?.focus(), 20); } }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const n = q.trim().toLowerCase();
    const pages: Hit[] = NAV.filter((p) => !n || p.label.toLowerCase().includes(n)).map((p) => ({ id: p.href, label: p.label, hint: "Page", href: p.href, icon: <p.icon className="h-4 w-4" aria-hidden /> }));
    const items: Hit[] = n.length < 2 ? [] : state.items.filter((i) => i.active && !i.sold && `${i.title} ${i.category} ${i.description}`.toLowerCase().includes(n)).slice(0, 7)
      .map((i) => ({ id: i.id, label: i.title, hint: i.category, href: `/discover/${i.id}`, icon: <CategoryIcon category={i.category} className="h-4 w-4" /> }));
    return [...items, ...pages].slice(0, 9);
  }, [q, state.items]);
  useEffect(() => setSel(0), [q]);

  if (!open) return null;
  const go = (h?: Hit) => { if (!h) return; onClose(); router.push(h.href); };
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]" role="presentation">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Search RELO" className="glass-panel rise relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-pop"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
          if (e.key === "Enter") go(hits[sel]);
        }}>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Search className="h-5 w-5 text-mute" aria-hidden />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items or jump to a page" aria-label="Search" className="w-full bg-transparent text-base text-ink placeholder:text-mute/70 focus:outline-none" />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-mute sm:block">Esc</kbd>
        </div>
        <ul role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto p-2">
          {hits.length === 0 && <li className="px-3 py-8 text-center text-sm text-mute">Nothing found for “{q}”.</li>}
          {hits.map((h, i) => (
            <li key={h.id} role="option" aria-selected={i === sel}>
              <button onMouseEnter={() => setSel(i)} onClick={() => go(h)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${i === sel ? "bg-navy text-white" : "text-ink"}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${i === sel ? "bg-white/15" : "bg-cyan-soft text-navy-700"}`}>{h.icon}</span>
                <span className="min-w-0 flex-1 truncate font-semibold">{h.label}</span>
                <span className={`text-xs ${i === sel ? "text-white/70" : "text-mute"}`}>{h.hint}</span>
                {i === sel && <CornerDownLeft className="h-3.5 w-3.5 opacity-70" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
