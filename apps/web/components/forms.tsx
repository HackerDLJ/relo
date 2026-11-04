"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Trash2, AlertTriangle } from "lucide-react";
import { CATEGORIES, CONDITIONS, validateBorrowDates, findConflict, LOCKING, type Condition, type Item, type Need, type Urgency } from "@relo/core/engine";
import { useAct, useStore, type NewItemInput } from "@/lib/store";
import { useToast } from "./toast";
import { useDerived } from "@/lib/derive";
import { AREAS } from "@/lib/areas";
import { Field, Modal, fmtRange, Badge } from "./ui";
import { ItemThumb } from "./item-bits";

const COMMON_REQS = ["Return cleaned", "Return charged", "Pickup only", "ID shown at pickup", "Handle with care", "Helmet recommended"];

/* ------------------------------------------------------------ borrow */

export function RequestDialog({ item, open, onClose, defaults, needId }: { item: Item; open: boolean; onClose(): void; defaults?: { from?: string; until?: string }; needId?: string }) {
  const { state, today } = useStore();
  const act = useAct();
  const { actions } = useStore();
  const { alternativesFor } = useDerived();
  const [from, setFrom] = useState(defaults?.from ?? "");
  const [until, setUntil] = useState(defaults?.until ?? "");
  const [purpose, setPurpose] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("normal");
  const [agreed, setAgreed] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  useEffect(() => { if (open) { setFrom(defaults?.from ?? ""); setUntil(defaults?.until ?? ""); setPurpose(""); setUrgency("normal"); setAgreed([]); setTouched(false); } }, [open, defaults?.from, defaults?.until]);

  const check = useMemo(() => (from && until ? validateBorrowDates({ item, from, until, requests: state.requests, today }) : null), [from, until, item, state.requests, today]);
  const booked = check && !check.ok && check.code === "conflict";
  const reserved = state.requests.filter((r) => r.itemId === item.id && LOCKING.has(r.status) && r.until >= today).sort((a, b) => a.from.localeCompare(b.from));
  const alts = booked ? alternativesFor(item, from, until) : [];
  const missingReqs = item.requirements.filter((r) => !agreed.includes(r));
  const dateError = touched && !from ? "Choose a start date." : touched && !until ? "Choose a return date." : check && !check.ok && !booked ? check.message : null;

  const submit = (waitlistIfBooked: boolean) => {
    setTouched(true);
    const res = act(() => actions.submitRequest({ itemId: item.id, from, until, purpose, urgency, agreed, waitlistIfBooked, needId }));
    if (res.ok) onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Request ${item.title}`} wide
      footer={<>
        <button className="btn-ghost" onClick={onClose}>Cancel</button>
        {booked ? <button className="btn-accent" onClick={() => submit(true)}>Join the waitlist</button> : <button className="btn-primary" onClick={() => submit(false)}>Send request</button>}
      </>}>
      <div className="space-y-4">
        <p className="text-sm text-mute">The owner shares this item {fmtRange(item.availableFrom, item.availableUntil)}. Once approved, your dates are locked so nobody else can book them.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Start date" error={touched && !from ? "Choose a start date." : null}>{(id) => <input id={id} type="date" className="input" min={today} value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
          <Field label="Return date" error={dateError}>{(id) => <input id={id} type="date" className="input" min={from || today} value={until} onChange={(e) => setUntil(e.target.value)} />}</Field>
        </div>
        {reserved.length > 0 && (
          <div className="rounded-xl bg-paper p-3 text-xs text-mute">
            <p className="mb-1.5 font-semibold text-ink">Already reserved</p>
            <div className="flex flex-wrap gap-1.5">{reserved.map((r) => <Badge key={r.id} tone="gray">{fmtRange(r.from, r.until)}</Badge>)}</div>
          </div>
        )}
        {booked && (
          <div role="alert" className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div><p className="font-semibold">Those dates are reserved.</p><p className="mt-0.5 text-xs">{check && !check.ok ? check.message : ""} You can join the waitlist, or pick a free alternative below.</p></div>
          </div>
        )}
        {alts.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold text-ink">Next-best alternatives for your dates</p>
            <ul className="space-y-2">{alts.map((a) => (
              <li key={a.item.id}><Link href={`/discover/${a.item.id}?from=${from}&until=${until}`} onClick={onClose} className="flex items-center gap-3 rounded-xl border border-line p-2.5 hover:bg-paper">
                <div className="w-14 shrink-0"><ItemThumb item={a.item} className="h-12" /></div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-navy">{a.item.title}</p><p className="text-xs text-mute">{a.reason}</p></div>
                <span className="rounded-full bg-navy px-2 py-0.5 text-xs font-bold text-cyan">{a.match.score}%</span>
              </Link></li>))}</ul>
          </div>
        )}
        <Field label="What will you use it for?" hint="Helps the owner decide. Be specific." error={touched && purpose.trim().length < 5 ? "Add a short purpose (at least 5 characters)." : null}>
          {(id) => <textarea id={id} rows={2} className="input" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Hanging shelves in my room this weekend" />}
        </Field>
        <Field label="How urgent is it?" hint="Urgency is one input to fair ranking; it never overrides availability.">
          {(id) => <select id={id} className="input" value={urgency} onChange={(e) => setUrgency(e.target.value as Urgency)}><option value="low">Flexible</option><option value="normal">Normal</option><option value="urgent">Urgent (deadline)</option></select>}
        </Field>
        {item.requirements.length > 0 && (
          <fieldset>
            <legend className="label">Lending requirements</legend>
            <div className="space-y-2">{item.requirements.map((r) => (
              <label key={r} className="flex items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-[#061B3A]" checked={agreed.includes(r)} onChange={(e) => setAgreed(e.target.checked ? [...agreed, r] : agreed.filter((x) => x !== r))} />I agree: {r}</label>))}</div>
            {touched && missingReqs.length > 0 && <p role="alert" className="mt-1 text-xs font-medium text-red-700">Please agree to all requirements to continue.</p>}
          </fieldset>
        )}
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------- listing */

function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file."));
    if (file.size > 10 * 1024 * 1024) return reject(new Error("Image is over 10 MB. Choose a smaller photo."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 720;
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.74));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("That image couldn't be read.")); };
    img.src = url;
  });
}

export function ListingForm({ open, onClose, item }: { open: boolean; onClose(): void; item?: Item }) {
  const { state, me, today, actions } = useStore();
  const toast = useToast();
  const blank = useMemo(() => ({ title: "", category: "", condition: "Good" as Condition, description: "", areaLabel: me.area, availableFrom: today, availableUntil: "", estValue: "", requirements: [] as string[], custom: "", photo: undefined as string | undefined }), [me.area, today]);
  const [f, setF] = useState(blank);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  void state;

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setF(item ? { title: item.title, category: item.category, condition: item.condition, description: item.description, areaLabel: item.areaLabel, availableFrom: item.availableFrom, availableUntil: item.availableUntil, estValue: String(item.estValue), requirements: item.requirements.filter((r) => COMMON_REQS.includes(r)), custom: item.requirements.filter((r) => !COMMON_REQS.includes(r)).join(", "), photo: item.photo } : blank);
  }, [open, item, blank]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  const onFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try { set("photo", await shrink(file)); setErr(null); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const save = () => {
    const input: NewItemInput = {
      title: f.title, description: f.description, category: f.category, condition: f.condition, areaLabel: f.areaLabel,
      availableFrom: f.availableFrom, availableUntil: f.availableUntil, estValue: Number(f.estValue), photo: f.photo,
      requirements: [...f.requirements, ...f.custom.split(",").map((s) => s.trim()).filter(Boolean)],
    };
    const res = item ? actions.updateItem(item.id, input) : actions.addItem(input);
    if (!res.ok) { setErr(res.error); return; }
    toast.success(res.message);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? "Edit listing" : "List an item"} wide
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save} disabled={busy}>{item ? "Save changes" : "Publish item"}</button></>}>
      <div className="space-y-4">
        {err && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{err}</p>}
        <div className="flex items-start gap-4">
          <div className="w-28 shrink-0 sm:w-36"><ItemThumb item={{ photo: f.photo, category: f.category || "Tools", title: f.title || "Preview" }} className="h-28 sm:h-32" /></div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold text-ink">Photo</p>
            <p className="text-xs text-mute">Optional. Resized and stored only in this browser in the prototype.</p>
            <div className="flex flex-wrap gap-2">
              <label className="btn-ghost btn-sm cursor-pointer"><ImagePlus className="h-4 w-4" aria-hidden />{f.photo ? "Replace" : "Upload"}<input type="file" accept="image/*" className="sr-only" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
              {f.photo && <button className="btn-danger btn-sm" onClick={() => set("photo", undefined)}><Trash2 className="h-4 w-4" aria-hidden />Remove</button>}
            </div>
          </div>
        </div>
        <Field label="Item name">{(id) => <input id={id} className="input" value={f.title} maxLength={80} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Cordless drill with bit set" />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category">{(id) => <select id={id} className="input" value={f.category} onChange={(e) => set("category", e.target.value)}><option value="">Select…</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>}</Field>
          <Field label="Condition">{(id) => <select id={id} className="input" value={f.condition} onChange={(e) => set("condition", e.target.value as Condition)}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>}</Field>
        </div>
        <Field label="Description" hint="What's included, how it should be handled.">{(id) => <textarea id={id} rows={3} className="input" value={f.description} onChange={(e) => set("description", e.target.value)} />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Available from">{(id) => <input id={id} type="date" className="input" value={f.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} />}</Field>
          <Field label="Available until">{(id) => <input id={id} type="date" className="input" min={f.availableFrom} value={f.availableUntil} onChange={(e) => set("availableUntil", e.target.value)} />}</Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Approximate location" hint="Neighbourhood only. Never your exact address.">{(id) => <select id={id} className="input" value={f.areaLabel} onChange={(e) => set("areaLabel", e.target.value)}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select>}</Field>
          <Field label="Approx. replacement value (₹)" hint="Used only for impact estimates.">{(id) => <input id={id} inputMode="numeric" className="input" value={f.estValue} onChange={(e) => set("estValue", e.target.value.replace(/[^\d]/g, ""))} placeholder="e.g. 4500" />}</Field>
        </div>
        <fieldset>
          <legend className="label">Lending requirements</legend>
          <div className="flex flex-wrap gap-2">{COMMON_REQS.map((r) => {
            const on = f.requirements.includes(r);
            return <button type="button" key={r} aria-pressed={on} onClick={() => set("requirements", on ? f.requirements.filter((x) => x !== r) : [...f.requirements, r])} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:bg-paper"}`}>{r}</button>;
          })}</div>
          <input className="input mt-2" aria-label="Other requirements" value={f.custom} onChange={(e) => set("custom", e.target.value)} placeholder="Other requirements, comma separated" />
        </fieldset>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------- need */

export function NeedForm({ open, onClose }: { open: boolean; onClose(): void }) {
  const { today, actions } = useStore();
  const toast = useToast();
  const [f, setF] = useState({ title: "", category: "", from: "", until: "", radiusKm: 10, details: "", urgency: "normal" as Urgency });
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setF({ title: "", category: "", from: today, until: "", radiusKm: 10, details: "", urgency: "normal" }); setErr(null); } }, [open, today]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const save = () => {
    const res = actions.postNeed(f);
    if (!res.ok) return setErr(res.error);
    toast.success(res.message);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Post what you need"
      footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={save}>Post need</button></>}>
      <div className="space-y-4">
        {err && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{err}</p>}
        <Field label="What do you need?">{(id) => <input id={id} className="input" value={f.title} maxLength={80} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Ladder for painting a ceiling" />}</Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category">{(id) => <select id={id} className="input" value={f.category} onChange={(e) => set("category", e.target.value)}><option value="">Select…</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>}</Field>
          <Field label="Urgency">{(id) => <select id={id} className="input" value={f.urgency} onChange={(e) => set("urgency", e.target.value as Urgency)}><option value="low">Flexible</option><option value="normal">Normal</option><option value="urgent">Urgent</option></select>}</Field>
          <Field label="Needed from">{(id) => <input id={id} type="date" className="input" min={today} value={f.from} onChange={(e) => set("from", e.target.value)} />}</Field>
          <Field label="Needed until">{(id) => <input id={id} type="date" className="input" min={f.from || today} value={f.until} onChange={(e) => set("until", e.target.value)} />}</Field>
        </div>
        <Field label={`Search radius: ${f.radiusKm} km`}>{(id) => <input id={id} type="range" min={1} max={25} value={f.radiusKm} onChange={(e) => set("radiusKm", Number(e.target.value))} className="w-full accent-[#061B3A]" />}</Field>
        <Field label="Requirements" hint="Size, power, capacity, pickup preferences…">{(id) => <textarea id={id} rows={3} className="input" value={f.details} onChange={(e) => set("details", e.target.value)} />}</Field>
      </div>
    </Modal>
  );
}

export type { Need };
export { findConflict };
