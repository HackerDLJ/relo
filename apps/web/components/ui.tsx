"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X, Inbox } from "lucide-react";

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: string; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-[26px] font-bold leading-tight text-navy sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SimBadge({ children = "Simulated" }: { children?: ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-cyan/50 bg-cyan-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-700">{children}</span>;
}

const TONES = {
  navy: "bg-navy text-white",
  cyan: "bg-cyan-soft text-navy-700 border border-cyan/40",
  green: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  amber: "bg-amber-50 text-amber-900 border border-amber-200",
  red: "bg-red-50 text-red-800 border border-red-200",
  gray: "bg-paper text-mute border border-line",
} as const;
export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONES[tone]}`}>{children}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-cyan-soft text-navy"><Inbox className="h-6 w-6" aria-hidden /></div>
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-mute">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children(id)}
      {hint && !error && <p className="mt-1 text-xs text-mute">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose(): void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus(), 30);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; prev?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`glass-panel rise relative flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-white shadow-pop sm:rounded-3xl ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-navy">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-full p-1.5 text-mute hover:bg-paper hover:text-ink"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ open, title, body, confirmLabel, danger, onConfirm, onClose }: { open: boolean; title: string; body: ReactNode; confirmLabel: string; danger?: boolean; onConfirm(): void; onClose(): void }) {
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><button className="btn-ghost" onClick={onClose}>Not now</button><button className={danger ? "btn bg-red-700 text-white hover:bg-red-800" : "btn-primary"} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</button></>}>
      <div className="text-sm leading-relaxed text-ink">{body}</div>
    </Modal>
  );
}

export function ScoreBar({ value, max = 100, label, detail }: { value: number; max?: number; label: string; detail?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-semibold text-ink">{label}</span>
        <span className="tabular-nums text-mute">{value}/{max}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper" role="img" aria-label={`${label}: ${value} of ${max}`}>
        <div className="h-full rounded-full bg-cyan transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      {detail && <p className="mt-1 text-xs text-mute">{detail}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: string; icon?: ReactNode }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between text-mute"><span className="text-xs font-semibold">{label}</span>{icon}</div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-navy sm:text-[28px]">{value}</div>
      {sub && <p className="mt-0.5 text-xs text-mute">{sub}</p>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange(v: NoInfer<T>): void; options: { value: NoInfer<T>; label: string }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-white p-1">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${value === o.value ? "bg-navy text-white" : "text-mute hover:text-ink"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  return <span aria-hidden className="inline-grid shrink-0 place-items-center rounded-full bg-navy font-semibold text-cyan-light" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>;
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center" role="status" aria-label={label}>
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-cyan-light border-t-navy" />
    </div>
  );
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
export const fmtRange = (a: string, b: string) => (a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`);
export const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
