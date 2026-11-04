"use client";

import Link from "next/link";
import { Armchair, Baby, Bike, BookOpen, CookingPot, Luggage, Music, MonitorSmartphone, Sprout, Wrench, Package, MapPin, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Item, MatchResult, BorrowRequest } from "@relo/core/engine";
import { Badge, ScoreBar } from "./ui";
import { ProductArt } from "./product-art";
import { perDay } from "@/lib/chat";

export const isSample = (id: string) => id.startsWith("s-");

const ICONS: Record<string, LucideIcon> = {
  Tools: Wrench, "Outdoor & Sports": Bike, Electronics: MonitorSmartphone, Kitchen: CookingPot, "Books & Study": BookOpen,
  "Furniture & Home": Armchair, Travel: Luggage, "Party & Events": Music, Garden: Sprout, "Baby & Kids": Baby,
};
export const CategoryIcon = ({ category, className = "h-6 w-6" }: { category: string; className?: string }) => {
  const I = ICONS[category] ?? Package;
  return <I className={className} aria-hidden />;
};

export function ItemThumb({ item, className = "h-36" }: { item: Pick<Item, "photo" | "category" | "title">; className?: string }) {
  if (item.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.photo} alt={item.title} className={`${className} w-full rounded-xl object-cover`} />;
  }
  return <ProductArt title={item.title} category={item.category} className={`${className} rounded-xl`} />;
}

export function ItemCard({ item, ownerName, trust, match, status, href }: {
  item: Item; ownerName: string; trust: number; match?: MatchResult; status: { label: string; tone: "green" | "amber" | "gray" | "red" }; href: string;
}) {
  return (
    <Link href={href} className="card group flex flex-col overflow-hidden p-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-pop focus-visible:shadow-pop">
      <div className="relative">
        <ItemThumb item={item} className="aspect-[4/3] !rounded-none" />
        {match && <span className="absolute right-2.5 top-2.5 rounded-full bg-navy/90 px-2.5 py-1 text-xs font-bold tabular-nums text-cyan shadow-card backdrop-blur">{match.score}% match</span>}
        {isSample(item.id) && <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-navy-600 shadow-card">Sample</span>}
      </div>
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#0E8FC4]">{item.category}</p>
        <h3 className="mt-0.5 text-[15.5px] font-semibold leading-snug text-navy">{item.title}</h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-mute">
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden />{match ? `${match.distanceKm.toFixed(1)} km` : item.areaLabel}</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" aria-hidden />{ownerName} · {Math.round(trust)}</span>
        </p>
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-line pt-3">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="text-sm font-bold text-navy">{perDay(item.pricePerDay)}</span>
        </div>
      </div>
    </Link>
  );
}

export function MatchBreakdown({ match }: { match: MatchResult }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink">{match.explanation}</p>
      {match.parts.map((p) => <ScoreBar key={p.key} label={p.label} value={p.points} max={p.max} detail={p.detail} />)}
      {match.blockers.length > 0 && <p className="text-xs text-amber-800">Heads up: {match.blockers.join("; ")}.</p>}
    </div>
  );
}

export const STATUS_TONE: Record<BorrowRequest["status"], "green" | "amber" | "gray" | "red" | "cyan" | "navy"> = {
  pending: "amber", approved: "green", waitlisted: "cyan", declined: "red", active: "navy", returned: "gray", cancelled: "gray",
};
export const STATUS_LABEL: Record<BorrowRequest["status"], string> = {
  pending: "Awaiting owner", approved: "Approved", waitlisted: "Waitlisted", declined: "Declined", active: "Borrowed", returned: "Returned", cancelled: "Cancelled",
};
