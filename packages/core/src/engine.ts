/**
 * RELO prototype engine: transparent, rule-based matching, fair request ranking,
 * double-booking prevention, trust, alternatives, overdue handling and impact estimates.
 * Pure functions only. Every score carries a human-readable explanation.
 */
import {
  DAY_MS,
  RELATED_CATEGORIES,
  addDays,
  daysBetween,
  inclusiveDays,
  isIsoDate,
  rangesOverlap,
  type BorrowRequest,
  type ISODate,
  type Item,
  type Settings,
  type TrustEvent,
  type TrustKind,
  type Urgency,
  type User,
} from "./domain";

export * from "./domain";

/* ------------------------------------------------------------------ geo */

const rad = (d: number) => (d * Math.PI) / 180;
export function km(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const dLat = rad(bLat - aLat);
  const dLon = rad(bLon - aLon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(x));
}
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/* --------------------------------------------------------- reservations */

/** Requests that lock an item's dates. Only approved and active loans block. */
export const LOCKING: ReadonlySet<string> = new Set(["approved", "active"]);

/** An overdue active loan keeps its item locked until it is actually returned (through today). */
export function lockEnd(r: BorrowRequest, today?: ISODate): ISODate {
  return today && r.status === "active" && r.until < today ? today : r.until;
}

export function findConflict(
  requests: BorrowRequest[],
  itemId: string,
  from: ISODate,
  until: ISODate,
  excludeRequestId?: string,
  today?: ISODate,
): BorrowRequest | undefined {
  return requests.find(
    (r) => r.itemId === itemId && r.id !== excludeRequestId && LOCKING.has(r.status) && rangesOverlap(from, until, r.from, lockEnd(r, today)),
  );
}

export type DateCheck = { ok: true } | { ok: false; code: string; message: string };

export function validateBorrowDates(args: {
  item: Item;
  from: ISODate;
  until: ISODate;
  requests: BorrowRequest[];
  today: ISODate;
  excludeRequestId?: string;
}): DateCheck {
  const { item, from, until, requests, today, excludeRequestId } = args;
  if (!from || !until) return { ok: false, code: "missing", message: "Choose both a start and an end date." };
  if (!isIsoDate(from) || !isIsoDate(until)) return { ok: false, code: "format", message: "Dates must be valid." };
  if (until < from) return { ok: false, code: "order", message: "The return date can't be before the start date." };
  if (from < today) return { ok: false, code: "past", message: "The start date can't be in the past." };
  if (inclusiveDays(from, until) > 30) return { ok: false, code: "long", message: "Loans are limited to 30 days." };
  if (!item.active) return { ok: false, code: "inactive", message: "This listing is currently paused by the owner." };
  if (from < item.availableFrom || until > item.availableUntil)
    return {
      ok: false,
      code: "window",
      message: `The owner shares this item between ${item.availableFrom} and ${item.availableUntil}.`,
    };
  const clash = findConflict(requests, item.id, from, until, excludeRequestId, today);
  if (clash)
    return {
      ok: false,
      code: "conflict",
      message: `Already reserved ${clash.from} to ${clash.until}. Pick other dates or join the waitlist.`,
    };
  return { ok: true };
}

/** Days within [from, until] that are inside the owner's window and not locked. */
export function freeDayCount(item: Item, requests: BorrowRequest[], from: ISODate, until: ISODate, today?: ISODate): number {
  let free = 0;
  for (let d = from; d <= until; d = addDays(d, 1)) {
    if (d < item.availableFrom || d > item.availableUntil) continue;
    const locked = requests.some((r) => r.itemId === item.id && LOCKING.has(r.status) && rangesOverlap(d, d, r.from, lockEnd(r, today)));
    if (!locked) free++;
  }
  return free;
}

export function isFullyAvailable(item: Item, requests: BorrowRequest[], from: ISODate, until: ISODate, today?: ISODate): boolean {
  return item.active && freeDayCount(item, requests, from, until, today) === inclusiveDays(from, until);
}

/** Pending requests that clash with a newly locked range become waitlisted (not rejected). */
export function requestsToWaitlist(requests: BorrowRequest[], locked: BorrowRequest): string[] {
  return requests
    .filter(
      (r) =>
        r.id !== locked.id &&
        r.itemId === locked.itemId &&
        r.status === "pending" &&
        rangesOverlap(r.from, r.until, locked.from, lockEnd(locked)),
    )
    .map((r) => r.id);
}

/**
 * When dates free up (cancel, early return, decline of an approved loan), waitlisted
 * requests that no longer clash with any locked range return to review. They keep their
 * original submission time.
 */
export function waitlistToReopen(requests: BorrowRequest[], itemId: string, today?: ISODate): string[] {
  return requests
    .filter((r) => r.itemId === itemId && r.status === "waitlisted" && !findConflict(requests, itemId, r.from, r.until, r.id, today))
    .map((r) => r.id);
}

/* ---------------------------------------------------------------- trust */

export const TRUST_BASE = 50;

export const TRUST_RULES: { kind: TrustKind; label: string; rule: string }[] = [
  { kind: "on_time_return", label: "Returned on time", rule: "+4 each" },
  { kind: "early_return", label: "Returned early", rule: "+5 each" },
  { kind: "lend_completed", label: "Completed a lend", rule: "+3 each" },
  { kind: "feedback", label: "Community feedback", rule: "(stars − 3) × 2, so −4 to +4" },
  { kind: "late_return", label: "Returned late", rule: "−(5 + 2 per late day), up to −20 (configurable)" },
  { kind: "late_cancellation", label: "Cancelled within 24h of start", rule: "−6 each" },
  { kind: "cancellation", label: "Cancelled in good time", rule: "−1 each" },
  { kind: "escalation", label: "Escalated overdue loan", rule: "−10 each" },
];

export type TrustSummary = {
  score: number;
  level: "Trusted neighbour" | "Reliable" | "Building trust" | "Needs attention";
  successfulReturns: number;
  lateReturns: number;
  cancellations: number;
  lends: number;
  feedbackCount: number;
  feedbackAvg: number | null;
  byKind: { kind: TrustKind; count: number; total: number }[];
};

export function trustLevel(score: number): TrustSummary["level"] {
  if (score >= 80) return "Trusted neighbour";
  if (score >= 60) return "Reliable";
  if (score >= 40) return "Building trust";
  return "Needs attention";
}

export function summarizeTrust(events: TrustEvent[]): TrustSummary {
  const score = clamp(Math.round(TRUST_BASE + events.reduce((s, e) => s + e.delta, 0)));
  const count = (k: TrustKind) => events.filter((e) => e.kind === k).length;
  const fb = events.filter((e) => e.kind === "feedback");
  const ratings = fb.map((e) => Number(e.refId?.split(":")[1])).filter((n) => Number.isFinite(n));
  const byKind = TRUST_RULES.map((r) => {
    const ev = events.filter((e) => e.kind === r.kind);
    return { kind: r.kind, count: ev.length, total: ev.reduce((s, e) => s + e.delta, 0) };
  });
  return {
    score,
    level: trustLevel(score),
    successfulReturns: count("on_time_return") + count("early_return"),
    lateReturns: count("late_return"),
    cancellations: count("cancellation") + count("late_cancellation"),
    lends: count("lend_completed"),
    feedbackCount: fb.length,
    feedbackAvg: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    byKind,
  };
}

export const trustOf = (events: TrustEvent[], userId: string): number =>
  summarizeTrust(events.filter((e) => e.userId === userId)).score;

export function latePenalty(daysLate: number, s: Settings): number {
  const effective = Math.max(0, daysLate - s.graceDays);
  if (effective <= 0) return 0;
  return Math.min(s.maxTrustPenalty, 5 + s.trustPenaltyPerDay * effective);
}

/* ------------------------------------------------------- item matching */

export type MatchPart = { key: string; label: string; points: number; max: number; detail: string };
export type MatchResult = {
  score: number;
  parts: MatchPart[];
  eligible: boolean;
  blockers: string[];
  distanceKm: number;
  explanation: string;
};

export type MatchContext = {
  lat: number;
  lon: number;
  category?: string;
  from?: ISODate;
  until?: ISODate;
  requirements?: string[];
  radiusKm?: number;
  ownerTrust: number;
  requests: BorrowRequest[];
  today: ISODate;
};

export const MATCH_WEIGHTS = { category: 30, distance: 25, dates: 20, requirements: 10, trust: 15 } as const;

/**
 * Score 0-100 using five transparent components:
 * category 30, distance 25, dates/availability 20, requirements 10, owner trust 15.
 */
export function matchItem(item: Item, ctx: MatchContext): MatchResult {
  const blockers: string[] = [];
  const W = MATCH_WEIGHTS;
  const dist = km(item.lat, item.lon, ctx.lat, ctx.lon);
  const radius = ctx.radiusKm ?? 25;

  // Category
  let catFrac = 1;
  let catDetail = "No category preference";
  if (ctx.category) {
    if (item.category === ctx.category) {
      catFrac = 1;
      catDetail = `Exact category match (${item.category})`;
    } else if ((RELATED_CATEGORIES[ctx.category] ?? []).includes(item.category)) {
      catFrac = 0.5;
      catDetail = `Related category (${item.category} for ${ctx.category})`;
      blockers.push("Different category from the one requested");
    } else {
      catFrac = 0;
      catDetail = `Different category (${item.category})`;
      blockers.push("Different category from the one requested");
    }
  }

  // Distance: full within 1 km, falling linearly to 0 at the search radius.
  const distFrac = clamp((1 - Math.max(0, dist - 1) / Math.max(1, radius - 1)) * 100) / 100;
  if (dist > radius) blockers.push(`Outside the ${radius} km radius`);

  // Dates
  let dateFrac: number;
  let dateDetail: string;
  if (ctx.from && ctx.until) {
    const need = inclusiveDays(ctx.from, ctx.until);
    const free = freeDayCount(item, ctx.requests, ctx.from, ctx.until, ctx.today);
    dateFrac = free / need;
    dateDetail = free === need ? `Free for all ${need} requested day${need > 1 ? "s" : ""}` : `Free for ${free} of ${need} requested days`;
    if (free < need) blockers.push(free === 0 ? "Dates are reserved or outside the owner's window" : "Only partly free for the requested dates");
  } else {
    const end = addDays(ctx.today, 13);
    const span = 14;
    const free = freeDayCount(item, ctx.requests, ctx.today, end, ctx.today);
    dateFrac = free / span;
    dateDetail = `Free on ${free} of the next ${span} days`;
  }
  if (!item.active) blockers.push("Listing is paused");

  // Requirements: how many of the borrower's stated requirements the item offers.
  const wanted = (ctx.requirements ?? []).map((r) => r.trim().toLowerCase()).filter(Boolean);
  const offered = new Set(item.requirements.map((r) => r.toLowerCase()));
  const itemText = `${item.title} ${item.description}`.toLowerCase();
  const met = wanted.filter((w) => offered.has(w) || itemText.includes(w)).length;
  const reqFrac = wanted.length ? met / wanted.length : 1;
  const reqDetail = wanted.length ? `${met} of ${wanted.length} stated requirements met` : "No special requirements";

  const trustFrac = clamp(ctx.ownerTrust) / 100;

  const parts: MatchPart[] = [
    { key: "category", label: "Category", points: Math.round(W.category * catFrac), max: W.category, detail: catDetail },
    { key: "distance", label: "Distance", points: Math.round(W.distance * distFrac), max: W.distance, detail: `${dist.toFixed(1)} km away` },
    { key: "dates", label: "Dates", points: Math.round(W.dates * dateFrac), max: W.dates, detail: dateDetail },
    { key: "requirements", label: "Requirements", points: Math.round(W.requirements * reqFrac), max: W.requirements, detail: reqDetail },
    { key: "trust", label: "Owner trust", points: Math.round(W.trust * trustFrac), max: W.trust, detail: `Owner trust score ${Math.round(ctx.ownerTrust)}` },
  ];
  const score = clamp(parts.reduce((s, p) => s + p.points, 0));
  const strongest = [...parts].sort((a, b) => b.points / b.max - a.points / a.max).slice(0, 2).map((p) => p.detail.toLowerCase());
  const explanation = `${score}% match: ${strongest.join("; ")}.`;
  const datesFree = !ctx.from || !ctx.until || isFullyAvailable(item, ctx.requests, ctx.from, ctx.until, ctx.today);
  return { score, parts, eligible: dist <= radius && item.active && datesFree, blockers, distanceKm: dist, explanation };
}

/* --------------------------------------------------- fair request rank */

export const PRIORITY_WEIGHTS = {
  match: 30,
  trust: 25,
  urgency: 20,
  time: 10,
  history: 8,
  denials: 7,
} as const;

const URGENCY_FRAC: Record<Urgency, number> = { low: 0, normal: 0.4, urgent: 1 };

export type PriorityInput = {
  request: BorrowRequest;
  matchScore: number;
  borrowerTrust: number;
  successfulBorrows: number;
  previousDenials: number;
  /** Earliest submission among the competing requests (anchor for the time component). */
  earliestSubmittedAt: string;
};

export type PriorityBreakdown = {
  total: number;
  parts: { key: string; label: string; points: number; max: number; detail: string }[];
};

/**
 * Request priority 0-100. Not first-come-first-served: submission time is only 10 of 100 points
 * and decays 1 point per 6 hours behind the earliest competitor.
 */
export function requestPriority(i: PriorityInput): PriorityBreakdown {
  const W = PRIORITY_WEIGHTS;
  const hoursBehind = Math.max(0, (Date.parse(i.request.submittedAt) - Date.parse(i.earliestSubmittedAt)) / (DAY_MS / 24));
  const timePts = Math.max(0, W.time - Math.floor(hoursBehind / 6));
  const parts = [
    { key: "match", label: "Match score", points: Math.round((W.match * i.matchScore) / 100), max: W.match, detail: `${i.matchScore}% match for these dates` },
    { key: "trust", label: "Trust score", points: Math.round((W.trust * i.borrowerTrust) / 100), max: W.trust, detail: `Borrower trust ${Math.round(i.borrowerTrust)}` },
    { key: "urgency", label: "Urgency", points: Math.round(W.urgency * URGENCY_FRAC[i.request.urgency]), max: W.urgency, detail: `Marked ${i.request.urgency}` },
    { key: "time", label: "Submission time", points: timePts, max: W.time, detail: hoursBehind < 1 ? "Among the earliest" : `${Math.round(hoursBehind)}h after the earliest request` },
    { key: "history", label: "Past successful borrowing", points: Math.min(W.history, i.successfulBorrows * 2), max: W.history, detail: `${i.successfulBorrows} returned loan${i.successfulBorrows === 1 ? "" : "s"} (+2 each, max 8)` },
    { key: "denials", label: "Fairness boost for past denials", points: Math.min(W.denials, Math.round(i.previousDenials * 2.5)), max: W.denials, detail: `${i.previousDenials} earlier declined request${i.previousDenials === 1 ? "" : "s"} (+2.5 each, max 7)` },
  ];
  return { total: parts.reduce((s, p) => s + p.points, 0), parts };
}

export type RankedRequest = { request: BorrowRequest; priority: PriorityBreakdown; rank: number; why: string };

export function rankCompetingRequests(inputs: Omit<PriorityInput, "earliestSubmittedAt">[]): RankedRequest[] {
  if (!inputs.length) return [];
  const earliest = inputs.reduce((m, i) => (i.request.submittedAt < m ? i.request.submittedAt : m), inputs[0].request.submittedAt);
  const scored = inputs.map((i) => ({ request: i.request, priority: requestPriority({ ...i, earliestSubmittedAt: earliest }) }));
  scored.sort(
    (a, b) =>
      b.priority.total - a.priority.total ||
      Date.parse(a.request.submittedAt) - Date.parse(b.request.submittedAt) ||
      a.request.id.localeCompare(b.request.id),
  );
  return scored.map((s, idx) => {
    const top = [...s.priority.parts].sort((a, b) => b.points - a.points).slice(0, 2);
    return { ...s, rank: idx + 1, why: `Priority ${s.priority.total}/100. Strongest: ${top.map((t) => `${t.label.toLowerCase()} (+${t.points})`).join(", ")}.` };
  });
}

/* -------------------------------------------------------- alternatives */

export type Alternative = { item: Item; match: MatchResult; reason: string };

/** Next-best items for a borrower when the wanted item is unavailable. */
export function findAlternatives(args: {
  wanted: Item;
  from: ISODate;
  until: ISODate;
  borrower: User;
  items: Item[];
  requests: BorrowRequest[];
  trustByUser: (userId: string) => number;
  today: ISODate;
  limit?: number;
}): Alternative[] {
  const { wanted, from, until, borrower, items, requests, trustByUser, today } = args;
  const related = new Set([wanted.category, ...(RELATED_CATEGORIES[wanted.category] ?? [])]);
  return items
    .filter((i) => i.id !== wanted.id && i.ownerId !== borrower.id && i.active && related.has(i.category))
    .map((item) => {
      const match = matchItem(item, {
        lat: borrower.lat,
        lon: borrower.lon,
        category: wanted.category,
        from,
        until,
        requirements: [],
        radiusKm: 25,
        ownerTrust: trustByUser(item.ownerId),
        requests,
        today,
      });
      return { item, match };
    })
    .filter((a) => isFullyAvailable(a.item, requests, from, until, today) && a.match.distanceKm <= 25)
    .sort((a, b) => b.match.score - a.match.score || a.match.distanceKm - b.match.distanceKm || a.item.id.localeCompare(b.item.id))
    .slice(0, args.limit ?? 3)
    .map(({ item, match }) => ({
      item,
      match,
      reason: `${item.category === wanted.category ? "Same category" : "Related category"}, ${match.distanceKm.toFixed(1)} km away, free for your dates.`,
    }));
}

/* ---------------------------------------------------- overdue handling */

export type OverdueStage = "upcoming" | "reminder" | "due_today" | "notice" | "warning" | "escalated" | "suspended";

export type OverdueStatus = {
  stage: OverdueStage;
  daysLate: number;
  daysLeft: number;
  label: string;
  action: string;
  projectedPenalty: number;
};

export function overdueStatus(r: BorrowRequest, today: ISODate, s: Settings): OverdueStatus {
  const daysLeft = daysBetween(today, r.until);
  const daysLate = Math.max(0, -daysLeft);
  const projectedPenalty = latePenalty(daysLate, s);
  const base = { daysLate, daysLeft, projectedPenalty };
  if (daysLate >= s.suspendAfterDays) return { ...base, stage: "suspended", label: "Borrowing suspended", action: "Borrowing privileges paused until the item is returned and reviewed." };
  if (daysLate >= s.escalationAfterDays) return { ...base, stage: "escalated", label: "Escalated", action: "Community moderators flagged; additional trust penalty applied." };
  if (daysLate >= s.warningAfterDays) return { ...base, stage: "warning", label: "Final warning", action: "Trust penalty accruing daily; owner and queue notified." };
  if (daysLate >= 1) return { ...base, stage: "notice", label: "Overdue notice", action: "Borrower and owner notified; extension can still be requested." };
  if (daysLeft === 0) return { ...base, stage: "due_today", label: "Due today", action: "Return today to keep your trust score intact." };
  if (daysLeft <= s.reminderDaysBefore) return { ...base, stage: "reminder", label: `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`, action: "Reminder sent to the borrower." };
  return { ...base, stage: "upcoming", label: `Due in ${daysLeft} days`, action: "On track." };
}

export const STAGE_ORDER: OverdueStage[] = ["upcoming", "reminder", "due_today", "notice", "warning", "escalated", "suspended"];

/* -------------------------------------------------------------- impact */

export type ImpactAssumption = { valueShare: number; kgPerItem: number; co2PerItem: number };

/**
 * ESTIMATES, not verified data. Per completed loan we assume 1 in 4 borrowers would
 * otherwise have bought the item new, avoiding that share of its price, mass and embodied CO2e.
 */
export const IMPACT_ASSUMPTIONS: Record<string, ImpactAssumption> = {
  Tools: { valueShare: 0.25, kgPerItem: 2.5, co2PerItem: 18 },
  "Outdoor & Sports": { valueShare: 0.25, kgPerItem: 9, co2PerItem: 60 },
  Electronics: { valueShare: 0.25, kgPerItem: 1.5, co2PerItem: 70 },
  Kitchen: { valueShare: 0.25, kgPerItem: 3, co2PerItem: 12 },
  "Books & Study": { valueShare: 0.25, kgPerItem: 1.2, co2PerItem: 3 },
  "Furniture & Home": { valueShare: 0.25, kgPerItem: 12, co2PerItem: 45 },
  Travel: { valueShare: 0.25, kgPerItem: 4, co2PerItem: 25 },
  "Party & Events": { valueShare: 0.25, kgPerItem: 5, co2PerItem: 15 },
  Garden: { valueShare: 0.25, kgPerItem: 4, co2PerItem: 14 },
  "Baby & Kids": { valueShare: 0.25, kgPerItem: 6, co2PerItem: 20 },
};
export const PURCHASE_AVOIDANCE_RATE = 0.25;

export type ImpactSummary = {
  resourcesListed: number;
  activeListings: number;
  completedLoans: number;
  reuseEvents: number;
  moneySavedInr: number;
  wasteAvoidedKg: number;
  co2AvoidedKg: number;
  estimated: true;
};

export function estimateImpact(items: Item[], requests: BorrowRequest[]): ImpactSummary {
  const byId = new Map(items.map((i) => [i.id, i]));
  let money = 0;
  let waste = 0;
  let co2 = 0;
  const done = requests.filter((r) => r.status === "returned");
  for (const r of done) {
    const item = byId.get(r.itemId);
    if (!item) continue;
    const a = IMPACT_ASSUMPTIONS[item.category] ?? { valueShare: 0.25, kgPerItem: 3, co2PerItem: 15 };
    money += item.estValue * PURCHASE_AVOIDANCE_RATE;
    waste += a.kgPerItem * PURCHASE_AVOIDANCE_RATE;
    co2 += a.co2PerItem * PURCHASE_AVOIDANCE_RATE;
  }
  return {
    resourcesListed: items.length,
    activeListings: items.filter((i) => i.active).length,
    completedLoans: done.length,
    reuseEvents: requests.filter((r) => r.status === "returned" || r.status === "active").length,
    moneySavedInr: Math.round(money),
    wasteAvoidedKg: Math.round(waste * 10) / 10,
    co2AvoidedKg: Math.round(co2 * 10) / 10,
    estimated: true,
  };
}
