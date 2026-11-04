import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "What RELO Does Differently" };

const ROWS = [
  { aspect: "Finding a match", typical: "You search and filter manually", relo: "System ranks items using category, distance, dates, and requirements", href: "/discover", cta: "See ranked Discover" },
  { aspect: "Demand side", typical: "Only items are listed", relo: "Requests are also posted, enabling two-way matching", href: "/requests", cta: "See Community Requests" },
  { aspect: "Availability", typical: "Often just a “still available?” chat message", relo: "Date-based availability with approved dates locked", href: "/listings", cta: "See locked dates" },
  { aspect: "Competing requests", typical: "First person to message wins, or the owner picks informally", relo: "Fair allocation using score, urgency, trust, and waitlist", href: "/waitlist", cta: "See the waitlist" },
  { aspect: "Item suddenly unavailable", typical: "Buyer is left stuck", relo: "System recommends the next-best alternative", href: "/borrowing", cta: "See alternatives" },
  { aspect: "Overdue returns", typical: "Left to the two people to argue about", relo: "Reminders, extensions, penalties, escalation, and queue notifications", href: "/returns", cta: "See Returns & Overdue" },
  { aspect: "Trust", typical: "Often a simple star rating, or none", relo: "Trust score feeds back into ranking and priority", href: "/trust", cta: "See Trust & Reputation" },
  { aspect: "Purpose", typical: "Selling or renting for money, mostly", relo: "Community sharing, short-term lending, and hyperlocal focus", href: "/impact", cta: "See Community Impact" },
] as const;

export default function DifferentPage() {
  return (
    <>
      <header className="mb-8 max-w-3xl">
        <p className="eyebrow mb-1.5">Eight things, all working in this prototype</p>
        <h1 className="text-[28px] font-bold leading-tight text-navy sm:text-4xl">What RELO Does Differently</h1>
        <p className="mt-2 text-sm leading-relaxed text-mute sm:text-base">Driven by quality. Re-loved products finding new homes. RELO isn't a place to buy and sell. It's a way for neighbours to lend what they rarely use and borrow what they only need for a while.</p>
      </header>

      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">How RELO differs from a typical modern platform across eight aspects</caption>
          <thead className="bg-navy text-white"><tr><th scope="col" className="w-[19%] px-5 py-3 text-xs font-semibold uppercase tracking-wide">Aspect</th><th scope="col" className="w-[31%] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white/75">Typical modern platform</th><th scope="col" className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-cyan-light">RELO's differentiation</th></tr></thead>
          <tbody className="divide-y divide-line">{ROWS.map((r, i) => (
            <tr key={r.aspect} className="align-top"><th scope="row" className="px-5 py-4 font-semibold text-navy"><span className="mr-2 text-xs text-mute">{i + 1}</span>{r.aspect}</th><td className="px-5 py-4 text-mute">{r.typical}</td><td className="px-5 py-4"><p className="font-semibold text-navy">{r.relo}</p><Link href={r.href} className="mt-1.5 inline-block text-xs font-semibold text-[#0E7BAA] hover:underline">{r.cta} →</Link></td></tr>))}</tbody>
        </table>
      </div>

      <ol className="space-y-3 md:hidden">{ROWS.map((r, i) => (
        <li key={r.aspect} className="card p-4"><p className="flex items-center gap-2 text-sm font-bold text-navy"><span className="grid h-6 w-6 place-items-center rounded-full bg-navy text-xs text-cyan">{i + 1}</span>{r.aspect}</p>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-mute">Typical modern platform</p><p className="text-sm text-mute">{r.typical}</p>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-[#0E7BAA]">RELO's differentiation</p><p className="text-sm font-semibold text-navy">{r.relo}</p>
          <Link href={r.href} className="mt-2 inline-block text-xs font-semibold text-[#0E7BAA] hover:underline">{r.cta} →</Link></li>))}</ol>

      <p className="mt-8 text-sm text-mute">The fundamental experience: <b className="text-navy">Find it. Share it. Borrow it. Return it. Reuse it.</b></p>
    </>
  );
}
