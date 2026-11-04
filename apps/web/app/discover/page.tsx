"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES } from "@relo/core/engine";
import { useStore } from "@/lib/store";
import { useDerived } from "@/lib/derive";
import { EmptyState, Field, PageHeader } from "@/components/ui";
import { ItemCard } from "@/components/item-bits";

type Sort = "match" | "distance" | "trust";

export default function DiscoverPage() {
  const { state, me, today, trust } = useStore();
  const { matchFor, userById } = useDerived();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("cat") ?? ""));
  const [radius, setRadius] = useState(25);
  const [avail, setAvail] = useState<"any" | "now" | "dates">("any");
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");
  const [sort, setSort] = useState<Sort>("match");
  const [showFilters, setShowFilters] = useState(false);

  const datesOk = avail !== "dates" || (from && until && from <= until);
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const useDates = avail === "dates" && from && until && from <= until;
    return state.items
      .filter((i) => i.active)
      .filter((i) => !cat || i.category === cat)
      .filter((i) => !needle || `${i.title} ${i.description} ${i.category}`.toLowerCase().includes(needle))
      .map((item) => ({ item, m: matchFor(item, { category: cat || undefined, from: useDates ? from : undefined, until: useDates ? until : undefined, radiusKm: 25 }) }))
      .filter(({ m }) => m.distanceKm <= radius)
      .map((r) => {
        const d = r.m.parts.find((p) => p.key === "dates")!;
        const frac = d.points / d.max;
        const status = useDates ? (r.m.eligible ? { label: "Free for your dates", tone: "green" as const } : frac > 0 ? { label: "Partly booked", tone: "amber" as const } : { label: "Reserved", tone: "gray" as const }) : frac >= 0.7 ? { label: "Available", tone: "green" as const } : frac > 0 ? { label: "Partly booked", tone: "amber" as const } : { label: "Booked", tone: "gray" as const };
        return { ...r, status, frac };
      })
      .filter((r) => (avail === "now" ? r.frac >= 0.5 : avail === "dates" && useDates ? r.m.eligible : true))
      .sort((a, b) => (sort === "distance" ? a.m.distanceKm - b.m.distanceKm : sort === "trust" ? trust(b.item.ownerId) - trust(a.item.ownerId) : b.m.score - a.m.score) || a.item.id.localeCompare(b.item.id));
  }, [state.items, state.requests, q, cat, radius, avail, from, until, sort, matchFor, trust]);

  const active = (cat ? 1 : 0) + (radius < 25 ? 1 : 0) + (avail !== "any" ? 1 : 0) + (q ? 1 : 0);
  const reset = () => { setQ(""); setCat(""); setRadius(25); setAvail("any"); setFrom(""); setUntil(""); setSort("match"); };
  const q2 = avail === "dates" && from && until ? `?from=${from}&until=${until}` : "";

  return (
    <>
      <PageHeader title="Discover" subtitle={`Items shared near ${me.area}. Each one is ranked for you, and you can see why.`} />
      <div className="card mb-5 p-3 sm:p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" aria-hidden />
            <input aria-label="Search items" className="input pl-10" placeholder="Search by name or description" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-ghost sm:hidden" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}><SlidersHorizontal className="h-4 w-4" aria-hidden />Filters{active > 0 && ` (${active})`}</button>
        </div>
        <div className={`${showFilters ? "grid" : "hidden"} mt-3 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4`}>
          <Field label="Distance">{(id) => <select id={id} className="input" value={radius} onChange={(e) => setRadius(Number(e.target.value))}>{[2, 5, 10, 25].map((r) => <option key={r} value={r}>Within {r} km</option>)}</select>}</Field>
          <Field label="Availability">{(id) => <select id={id} className="input" value={avail} onChange={(e) => setAvail(e.target.value as typeof avail)}><option value="any">Any time</option><option value="now">Free in the next 2 weeks</option><option value="dates">Free for my dates</option></select>}</Field>
          <Field label="Sort by">{(id) => <select id={id} className="input" value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="match">Best match</option><option value="distance">Distance</option><option value="trust">Owner trust</option></select>}</Field>
          <div className="flex items-end"><button className="btn-ghost w-full" onClick={reset} disabled={active === 0 && sort === "match"}><X className="h-4 w-4" aria-hidden />Clear filters</button></div>
          {avail === "dates" && <>
            <Field label="From" error={from && until && from > until ? "End is before start" : null}>{(id) => <input id={id} type="date" className="input" min={today} value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
            <Field label="Until">{(id) => <input id={id} type="date" className="input" min={from || today} value={until} onChange={(e) => setUntil(e.target.value)} />}</Field>
            {!datesOk && <p className="self-end text-xs text-mute sm:col-span-2">Choose both dates to filter by your dates.</p>}
          </>}
        </div>
        <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Category filters">
          {["", ...CATEGORIES].map((c) => (
            <button key={c || "all"} aria-pressed={cat === c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${cat === c ? "border-navy bg-navy text-white" : "border-line bg-white text-ink hover:bg-paper"}`}>{c || "All"}</button>
          ))}
        </div>
      </div>

      <p className="mb-3 text-sm text-mute" aria-live="polite">{results.length} item{results.length === 1 ? "" : "s"}{cat && ` in ${cat}`}, sorted by {sort === "match" ? "best match" : sort === "distance" ? "distance" : "owner trust"}</p>
      {results.length === 0 ? (
        <EmptyState title="Nothing matches yet" body="Try a wider distance, a different category or other dates. You can also post what you need and let owners come to you." action={<div className="flex gap-2"><button className="btn-ghost" onClick={reset}>Clear filters</button><a className="btn-primary" href="/requests">Post a need</a></div>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(({ item, m, status }) => (
            <ItemCard key={item.id} item={item} ownerName={item.ownerId === me.id ? "You" : userById(item.ownerId).name} trust={trust(item.ownerId)} match={m} status={item.ownerId === me.id ? { label: "Your listing", tone: "gray" } : status} href={`/discover/${item.id}${q2}`} />
          ))}
        </div>
      )}
    </>
  );
}
