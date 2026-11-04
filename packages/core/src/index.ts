export type ItemCandidate = {
  id: string;
  title: string;
  category: string;
  latitude: number;
  longitude: number;
  availableFrom: string; // ISO date
  availableUntil: string; // ISO date
  requirements: string[];
  status: "available" | "reserved" | "borrowed" | "unavailable" | "damaged" | "lost";
};

export type BorrowNeed = {
  category: string;
  latitude: number;
  longitude: number;
  from: string;
  until: string;
  requirements: string[];
};

export type MatchWeights = {
  category: number;
  location: number;
  availability: number;
  requirements: number;
};

export type MatchResult = {
  item: ItemCandidate;
  score: number;
  breakdown: MatchWeights;
  eligible: boolean;
  reasons: string[];
};

const DEFAULT_WEIGHTS: MatchWeights = {
  category: 0.35,
  location: 0.30,
  availability: 0.20,
  requirements: 0.15,
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const earthRadiusKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(x));
}

function overlapDays(item: ItemCandidate, need: BorrowNeed): number {
  const start = Math.max(Date.parse(item.availableFrom), Date.parse(need.from));
  const end = Math.min(Date.parse(item.availableUntil), Date.parse(need.until));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

export function scoreCandidate(
  item: ItemCandidate,
  need: BorrowNeed,
  weights: MatchWeights = DEFAULT_WEIGHTS,
): MatchResult {
  const reasons: string[] = [];
  const category = item.category.toLowerCase() === need.category.toLowerCase() ? 100 : 0;
  const km = distanceKm(item.latitude, item.longitude, need.latitude, need.longitude);
  // Full score within 1 km, declining linearly to zero at 25 km.
  const location = clamp((1 - Math.max(0, km - 1) / 24) * 100);
  const requestedDays = Math.max(
    1,
    Math.floor((Date.parse(need.until) - Date.parse(need.from)) / 86_400_000) + 1,
  );
  const overlap = overlapDays(item, need);
  const availability = clamp((overlap / requestedDays) * 100);
  const required = new Set(need.requirements.map((x) => x.toLowerCase()));
  const offered = new Set(item.requirements.map((x) => x.toLowerCase()));
  const matched = [...required].filter((x) => offered.has(x)).length;
  const requirements = required.size === 0 ? 100 : (matched / required.size) * 100;

  const statusEligible = item.status === "available";
  const categoryEligible = category === 100;
  const datesEligible = overlap === requestedDays;
  const eligible = statusEligible && categoryEligible && datesEligible;

  if (!statusEligible) reasons.push(`Item is ${item.status}, not available`);
  if (!categoryEligible) reasons.push("Category does not match");
  if (!datesEligible) reasons.push("Item does not cover the full requested period");
  if (km > 25) reasons.push("Outside the 25 km discovery radius");

  const totalWeight = weights.category + weights.location + weights.availability + weights.requirements;
  const normalized = totalWeight > 0 ? 1 / totalWeight : 0;
  const score = Math.round(
    (category * weights.category +
      location * weights.location +
      availability * weights.availability +
      requirements * weights.requirements) * normalized,
  );

  return {
    item,
    score,
    breakdown: {
      category: Math.round(category * weights.category * normalized),
      location: Math.round(location * weights.location * normalized),
      availability: Math.round(availability * weights.availability * normalized),
      requirements: Math.round(requirements * weights.requirements * normalized),
    },
    eligible: eligible && km <= 25,
    reasons,
  };
}

export function rankCandidates(
  items: ItemCandidate[],
  need: BorrowNeed,
  weights: MatchWeights = DEFAULT_WEIGHTS,
): MatchResult[] {
  return items
    .map((item) => scoreCandidate(item, need, weights))
    .filter((result) => result.eligible)
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
}

export type AllocationRequest = {
  id: string;
  borrowerId: string;
  submittedAt: string;
  matchScore: number;
  completedBorrowCount: number;
  previousDenials: number;
};

/**
 * Transparent tie-break order for requests on the same item:
 * 1. Higher match score
 * 2. Fewer successful borrows (broader access)
 * 3. Fewer previous denials
 * 4. Earlier submission
 * 5. Stable ID for deterministic results
 *
 * This orders a queue; the database must still atomically reserve the item.
 */
export function rankRequests(requests: AllocationRequest[]): AllocationRequest[] {
  return [...requests].sort(
    (a, b) =>
      b.matchScore - a.matchScore ||
      a.completedBorrowCount - b.completedBorrowCount ||
      b.previousDenials - a.previousDenials ||
      Date.parse(a.submittedAt) - Date.parse(b.submittedAt) ||
      a.id.localeCompare(b.id),
  );
}
