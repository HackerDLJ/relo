"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type T = { id: number; kind: "success" | "error"; text: string };
type Api = { success(t: string): void; error(t: string): void };
const Ctx = createContext<Api | null>(null);
let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((kind: T["kind"], text: string) => {
    const id = ++seq;
    setItems((x) => [...x.slice(-3), { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === "error" ? 6500 : 4200);
  }, []);
  const api = useMemo<Api>(() => ({ success: (t) => push("success", t), error: (t) => push("error", t) }), [push]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6" aria-live="polite" role="status">
        {items.map((t) => (
          <div key={t.id} className={`rise pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl2 border bg-white p-3.5 shadow-pop ${t.kind === "error" ? "border-red-200" : "border-line"}`}>
            {t.kind === "error" ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0E8FC4]" aria-hidden />}
            <p className="flex-1 text-sm leading-snug text-ink">{t.text}</p>
            <button aria-label="Dismiss" className="text-mute hover:text-ink" onClick={() => setItems((x) => x.filter((y) => y.id !== t.id))}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): Api {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used inside ToastProvider");
  return c;
}
