"use client";

import { Leaf, Recycle, PiggyBank, Package, Repeat, CloudOff } from "lucide-react";
import { IMPACT_ASSUMPTIONS, PURCHASE_AVOIDANCE_RATE, estimateImpact, CATEGORIES } from "@relo/core/engine";
import { useStore } from "@/lib/store";
import { Badge, PageHeader, Stat, inr } from "@/components/ui";

export default function ImpactPage() {
  const { state } = useStore();
  const all = estimateImpact(state.items, state.requests);
  const byCat = CATEGORIES.map((c) => {
    const items = state.items.filter((i) => i.category === c);
    const ids = new Set(items.map((i) => i.id));
    const imp = estimateImpact(items, state.requests.filter((r) => ids.has(r.itemId)));
    return { c, imp };
  }).filter((x) => x.imp.resourcesListed > 0).sort((a, b) => b.imp.co2AvoidedKg - a.imp.co2AvoidedKg);
  const maxCo2 = Math.max(1, ...byCat.map((x) => x.imp.co2AvoidedKg));

  return (
    <>
      <PageHeader eyebrow="Measurable, honestly labelled" title="Community Impact" subtitle="Counts come straight from activity in the app. Money, waste and CO₂ figures are estimates built on stated assumptions, not verified measurements." />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-label="Impact figures">
        <Stat label="Resources listed" value={all.resourcesListed} sub={`${all.activeListings} active now`} icon={<Package className="h-4 w-4" aria-hidden />} />
        <Stat label="Successful borrowing transactions" value={all.completedLoans} sub="returned loans, counted from data" icon={<Repeat className="h-4 w-4" aria-hidden />} />
        <Stat label="Reuse events" value={all.reuseEvents} sub="returned + currently borrowed" icon={<Recycle className="h-4 w-4" aria-hidden />} />
        <Stat label="Money saved" value={inr(all.moneySavedInr)} sub="Estimate" icon={<PiggyBank className="h-4 w-4" aria-hidden />} />
        <Stat label="Waste avoided" value={`${all.wasteAvoidedKg} kg`} sub="Estimate" icon={<Leaf className="h-4 w-4" aria-hidden />} />
        <Stat label="CO₂e avoided" value={`${all.co2AvoidedKg} kg`} sub="Estimate" icon={<CloudOff className="h-4 w-4" aria-hidden />} />
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="bycat"><div className="mb-3 flex items-center justify-between"><h2 id="bycat" className="text-base font-semibold text-navy">Estimated CO₂e avoided by category</h2><Badge tone="cyan">Estimate</Badge></div>
          {byCat.every((x) => x.imp.co2AvoidedKg === 0) ? <p className="text-sm text-mute">Complete a loan to see impact here.</p> : (
            <ul className="space-y-3">{byCat.map(({ c, imp }) => <li key={c}><div className="flex justify-between text-xs"><span className="font-semibold text-ink">{c}</span><span className="tabular-nums text-mute">{imp.co2AvoidedKg} kg · {imp.completedLoans} loan{imp.completedLoans === 1 ? "" : "s"}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-paper" role="img" aria-label={`${c}: ${imp.co2AvoidedKg} kg CO2e`}><div className="h-full rounded-full bg-cyan transition-all duration-500" style={{ width: `${(imp.co2AvoidedKg / maxCo2) * 100}%` }} /></div></li>)}</ul>)}</section>

        <section className="card p-5" aria-labelledby="how"><h2 id="how" className="mb-2 text-base font-semibold text-navy">How these estimates work</h2>
          <p className="text-sm leading-relaxed text-mute">For each <b className="text-ink">returned</b> loan we assume {Math.round(PURCHASE_AVOIDANCE_RATE * 100)}% of borrowers would otherwise have bought the item new. We then count that share of its replacement value, weight and embodied CO₂e. Counts (listings, loans, reuse events) are exact; everything in ₹, kg and CO₂e is an estimate.</p>
          <p className="mt-2 text-xs text-mute">Replacement values are entered by owners. Weights and embodied-carbon figures below are rough category averages chosen for this prototype, not sourced from lifecycle assessments.</p>
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[320px] text-left text-xs"><thead className="text-mute"><tr><th className="py-1 pr-2 font-semibold">Category</th><th className="py-1 pr-2 text-right font-semibold">kg / item</th><th className="py-1 text-right font-semibold">CO₂e / item</th></tr></thead><tbody className="divide-y divide-line">{Object.entries(IMPACT_ASSUMPTIONS).map(([k, v]) => <tr key={k}><td className="py-1.5 pr-2 text-ink">{k}</td><td className="py-1.5 pr-2 text-right tabular-nums">{v.kgPerItem}</td><td className="py-1.5 text-right tabular-nums">{v.co2PerItem} kg</td></tr>)}</tbody></table></div></section>
      </div>
    </>
  );
}
