"use client";

import { useState } from "react";
import { FlaskConical, RotateCcw, FastForward } from "lucide-react";
import { useAct, useStore } from "@/lib/store";
import { Avatar, Badge, Confirm, PageHeader, SimBadge } from "@/components/ui";

export default function ProfilePage() {
  const { state, me, today, actions } = useStore();
  const act = useAct();
  const [reset, setReset] = useState(false);
  const mine = state.items.filter((i) => i.ownerId === me.id).length;

  return (
    <>
      <PageHeader title="Profile & Settings" subtitle="Your demo profile, account switching and the prototype's simulation controls." />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="me"><div className="flex items-center gap-4"><Avatar name={me.name} size={56} /><div><h2 id="me" className="text-lg font-semibold text-navy">{me.name}</h2><p className="text-sm text-mute">{me.area}, Tirunelveli (approximate) · member since {me.joined}</p><div className="mt-1.5 flex gap-2"><SimBadge>Demo account</SimBadge><Badge tone="gray">{mine} listing{mine === 1 ? "" : "s"}</Badge></div></div></div>
          <p className="mt-4 text-sm text-ink">{me.bio}</p><p className="mt-3 text-xs text-mute">Only your neighbourhood is shown to others, never an exact address.</p></section>

        <section className="card p-5" aria-labelledby="acc"><h2 id="acc" className="mb-1 text-lg font-semibold text-navy">Switch demo account</h2><p className="mb-3 text-xs text-mute">Experience both sides: be the borrower, then switch to the owner to approve.</p>
          <ul className="space-y-1.5">{state.users.map((u) => <li key={u.id}><button onClick={() => act(() => actions.switchUser(u.id))} aria-pressed={u.id === me.id} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm ${u.id === me.id ? "border-navy bg-navy text-white" : "border-line bg-white hover:bg-paper"}`}><Avatar name={u.name} size={28} /><span className="flex-1 font-semibold">{u.name}</span><span className={`text-xs ${u.id === me.id ? "text-cyan-light" : "text-mute"}`}>{u.area}</span></button></li>)}</ul></section>

        <section id="demo" className="card p-5 lg:col-span-2" aria-labelledby="sim"><h2 id="sim" className="mb-1 flex items-center gap-2 text-lg font-semibold text-navy"><FlaskConical className="h-5 w-5" aria-hidden />Prototype controls <SimBadge /></h2>
          <p className="mb-4 text-sm text-mute">Today in the demo is <b className="text-ink">{today}</b>{state.clockOffset > 0 ? ` (${state.clockOffset} day${state.clockOffset > 1 ? "s" : ""} ahead of the real date)` : ""}. Move the clock forward to see reminders, overdue notices, penalties and escalation happen on real loans.</p>
          <div className="flex flex-wrap gap-2">{[1, 3, 7].map((n) => <button key={n} className="btn-ghost" onClick={() => act(() => actions.advanceDays(n))}><FastForward className="h-4 w-4" aria-hidden />+{n} day{n > 1 ? "s" : ""}</button>)}<button className="btn-danger" onClick={() => setReset(true)}><RotateCcw className="h-4 w-4" aria-hidden />Reset demo data</button></div>
          <div className="mt-5 grid gap-4 text-sm md:grid-cols-2"><div className="rounded-xl bg-paper p-4"><p className="mb-1.5 font-semibold text-emerald-800">Working for real in this build</p><ul className="list-disc space-y-1 pl-5 text-mute"><li>Listings, photos, search, filters, sorting and match scoring</li><li>Date locking and double-booking prevention</li><li>Ranked requests, waitlist, alternatives, extensions, returns</li><li>Trust and impact updates. Data persists in this browser (localStorage).</li></ul></div>
            <div className="rounded-xl bg-paper p-4"><p className="mb-1.5 font-semibold text-navy-700">Simulated or not built</p><ul className="list-disc space-y-1 pl-5 text-mute"><li>People, items and loans are demo data; accounts have no passwords.</li><li>Notifications are in-app only. No email, SMS or push.</li><li>No server, shared database or sign-in yet, so data isn't shared between devices.</li><li>Locations are neighbourhood-level approximations.</li></ul></div></div></section>
      </div>
      <Confirm open={reset} title="Reset all demo data?" confirmLabel="Reset" danger onClose={() => setReset(false)} onConfirm={() => act(() => actions.resetDemo())} body="This replaces everything in this browser with the original seed data, including any items, requests and photos you added." />
    </>
  );
}
