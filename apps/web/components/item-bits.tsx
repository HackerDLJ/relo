"use client";

import Link from "next/link";
import { Armchair, Baby, Bike, BookOpen, CookingPot, Luggage, Music, MonitorSmartphone, Sprout, Wrench, Package, MapPin, ShieldCheck, BadgeCheck, type LucideIcon } from "lucide-react";
import type { Item, MatchResult, BorrowRequest } from "@relo/core/engine";
import { Badge, ScoreBar } from "./ui";
import { canRent } from "@relo/core/engine";
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
    // Bundled product photos (/products/...) are studio shots on plain backgrounds, so show them whole; uploads fill the frame.
    const bundled = item.photo.startsWith("/");
    return <img src={item.photo} alt={item.title} loading="lazy" className={`${className} w-full rounded-xl ${bundled ? "bg-white object-contain" : "object-cover"}`} />;
  }
  return <ProductArt title={item.title} category={item.category} className={`${className} rounded-xl`} />;
}

export function ItemCard({ item, ownerName, trust, match, status, href }: {
  item: Item; ownerName: string; trust: number; match?: MatchResult; status: { label: string; tone: "green" | "amber" | "gray" | "red" | "cyan" }; href: string;
}) {
  return (
    <Link href={href} className="card group flex flex-col overflow-hidden p-0 transition duration-200 hover:-translate-y-0.5 hover:shadow-pop focus-visible:shadow-pop">
      <div className="relative">
        <ItemThumb item={item} className="aspect-[4/3] !rounded-none" />
        {match && <span className="absolute right-2.5 top-2.5 rounded-full bg-navy/90 px-2.5 py-1 text-xs font-bold tabular-nums text-cyan shadow-card backdrop-blur">{match.score}% match</span>}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {item.refurb && <RefurbBadge item={item} />}
          {isSample(item.id) && <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-navy-600 shadow-card">Sample</span>}
        </div>
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
          <PriceTags item={item} />
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

const GRADE_TEXT = { A: "Like new", B: "Good", C: "Works well, shows wear" } as const;
export const gradeText = (g: "A" | "B" | "C") => GRADE_TEXT[g];

export function RefurbBadge({ item }: { item: Pick<Item, "refurb"> }) {
  if (!item.refurb) return null;
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-card"><BadgeCheck className="h-3 w-3" aria-hidden />Refurbished · {item.refurb.grade}</span>;
}

/** Rent and/or sale price, whichever the owner offers. */
export function PriceTags({ item }: { item: Pick<Item, "mode" | "pricePerDay" | "salePrice" | "sold"> }) {
  const mode = item.mode ?? "rent";
  if (item.sold) return <span className="text-sm font-bold text-mute">Sold</span>;
  return (
    <span className="flex flex-col items-end text-right leading-tight">
      {mode !== "sell" && <span className="text-sm font-bold text-navy">{perDay(item.pricePerDay)}</span>}
      {mode !== "rent" && <span className={mode === "both" ? "text-xs font-semibold text-emerald-700" : "text-sm font-bold text-navy"}>{mode === "both" ? "or buy " : "Buy "}₹{Math.round(item.salePrice ?? 0).toLocaleString("en-IN")}</span>}
    </span>
  );
}
export { canRent };
