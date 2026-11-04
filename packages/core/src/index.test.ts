import { describe, expect, it } from "vitest";
import { rankCandidates, rankRequests, type BorrowNeed, type ItemCandidate } from "./index";

const need: BorrowNeed = {
  category: "bicycle",
  latitude: 8.7139,
  longitude: 77.7567,
  from: "2026-11-05",
  until: "2026-11-07",
  requirements: ["helmet"],
};

const items: ItemCandidate[] = [
  { id: "near", title: "Nearby bicycle", category: "bicycle", latitude: 8.714, longitude: 77.757,
    availableFrom: "2026-11-01", availableUntil: "2026-11-10", requirements: ["helmet"], status: "available" },
  { id: "busy", title: "Busy bicycle", category: "bicycle", latitude: 8.714, longitude: 77.757,
    availableFrom: "2026-11-01", availableUntil: "2026-11-10", requirements: ["helmet"], status: "borrowed" },
  { id: "short", title: "Short window", category: "bicycle", latitude: 8.714, longitude: 77.757,
    availableFrom: "2026-11-05", availableUntil: "2026-11-06", requirements: ["helmet"], status: "available" },
];

describe("RELO matching", () => {
  it("returns only available items covering the full requested period", () => {
    expect(rankCandidates(items, need).map((x) => x.item.id)).toEqual(["near"]);
  });
  it("provides a score breakdown", () => {
    const [match] = rankCandidates(items, need);
    expect(match.score).toBeGreaterThan(90);
    expect(match.breakdown.category).toBeGreaterThan(0);
  });
});

describe("RELO fair request ordering", () => {
  it("uses score, access history, denials and submission time deterministically", () => {
    const ordered = rankRequests([
      { id: "b", borrowerId: "2", submittedAt: "2026-11-04T10:00:00Z", matchScore: 90, completedBorrowCount: 5, previousDenials: 0 },
      { id: "a", borrowerId: "1", submittedAt: "2026-11-04T11:00:00Z", matchScore: 90, completedBorrowCount: 1, previousDenials: 0 },
    ]);
    expect(ordered.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
