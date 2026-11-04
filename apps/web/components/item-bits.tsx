"use client";

import Link from "next/link";
import { Armchair, Baby, Bike, BookOpen, CookingPot, Luggage, Music, MonitorSmartphone, Sprout, Wrench, Package, MapPin, ShieldCheck, type LucideIcon } from "lucide-react";
import type { Item, MatchResult, BorrowRequest } from "@relo/core/engine";
import { Badge, ScoreBar } from "./ui";

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
  return (
    <div className={`${className} grid w-full place-items-center rounded-xl bg-cyan-soft text-navy`} role="img" aria-label={`${item.category} item, no photo`}>
      <CategoryIcon category={item.category} className="h-10 w-10 opacity-80" />
    </div>
  );
}

export function ItemCard({ item, ownerName, trust, match, status, href }: {
  item: Item; ownerName: string; trust: number; match?: MatchResult; status: { label: string; tone: "green" | "amber" | "gray" | "red" }; href: string;
}) {
  return (
    <Link href={href} className="card group flex flex-col p-3 transition-shadow hover:shadow-pop focus-visible:shadow-pop">
      <ItemThumb item={item} />
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-semibold leading-snug text-navy">{item.title}</h3>
          {match && <span className="shrink-0 rounded-full bg-navy px-2 py-0.5 text-xs font-bold tabular-nums text-cyan">{match.score}%</span>}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-mute">
          <span>{item.category}</span>
          <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" aria-hidden />{match ? `${match.distanceKm.toFixed(1)} km` : item.areaLabel}</span>
        </p>
        <p className="mt-0.5 text-xs text-mute">{ownerName} · <span className="inline-flex items-center gap-0.5"><ShieldCheck className="h-3 w-3" aria-hidden />{Math.round(trust)}</span></p>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
          <Badge tone={status.tone}>{status.label}</Badge>
          <span className="text-xs font-semibold text-navy-600 group-hover:underline">View</span>
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
