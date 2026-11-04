import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  estimateImpact,
  findAlternatives,
  findConflict,
  latePenalty,
  matchItem,
  overdueStatus,
  rankCompetingRequests,
  requestsToWaitlist,
  summarizeTrust,
  validateBorrowDates,
  waitlistToReopen,
  type BorrowRequest,
  type Item,
  type TrustEvent,
  type User,
} from "./engine";

const TODAY = "2026-11-04";
const item = (o: Partial<Item> = {}): Item => ({
  id: "i1", ownerId: "o1", title: "Drill", description: "Cordless drill", category: "Tools", condition: "Good",
  areaLabel: "Palayamkottai", lat: 8.7139, lon: 77.7567, availableFrom: "2026-11-01", availableUntil: "2026-12-31",
  requirements: ["Return cleaned"], active: true, estValue: 4000, createdAt: "2026-10-01T00:00:00Z", ...o,
});
const req = (o: Partial<BorrowRequest> = {}): BorrowRequest => ({
  id: "r1", itemId: "i1", borrowerId: "b1", from: "2026-11-10", until: "2026-11-12", originalUntil: "2026-11-12",
  purpose: "x", urgency: "normal", agreedRequirements: [], submittedAt: "2026-11-04T08:00:00Z", status: "pending", ...o,
});
const user: User = { id: "b1", name: "B", area: "A", lat: 8.7139, lon: 77.7567, joined: "2026-01-01", bio: "", demo: true };

describe("double-booking prevention", () => {
  it("only approved and active requests lock dates", () => {
    const rs = [req({ id: "a", status: "pending" }), req({ id: "b", status: "waitlisted" }), req({ id: "c", status: "declined" })];
    expect(findConflict(rs, "i1", "2026-11-10", "2026-11-12")).toBeUndefined();
    expect(findConflict([req({ status: "approved" })], "i1", "2026-11-12", "2026-11-14")?.id).toBe("r1");
    expect(findConflict([req({ status: "active" })], "i1", "2026-11-13", "2026-11-14")).toBeUndefined();
  });
  it("rejects overlapping, past, reversed and out-of-window dates", () => {
    const locked = [req({ status: "approved" })];
    const v = (from: string, until: string) => validateBorrowDates({ item: item(), from, until, requests: locked, today: TODAY });
    expect(v("2026-11-11", "2026-11-13")).toMatchObject({ ok: false, code: "conflict" });
    expect(v("2026-11-02", "2026-11-03")).toMatchObject({ ok: false, code: "past" });
    expect(v("2026-11-08", "2026-11-06")).toMatchObject({ ok: false, code: "order" });
    expect(v("2027-01-01", "2027-01-02")).toMatchObject({ ok: false, code: "window" });
    expect(v("2026-11-13", "2026-11-15")).toEqual({ ok: true });
  });
  it("moves clashing pending requests to the waitlist, then reopens them when dates free up", () => {
    const winner = req({ id: "w", status: "approved" });
    const loser = req({ id: "l", status: "pending", from: "2026-11-11", until: "2026-11-13" });
    const other = req({ id: "o", status: "pending", from: "2026-11-20", until: "2026-11-21" });
    expect(requestsToWaitlist([winner, loser, other], winner)).toEqual(["l"]);
    const afterWaitlist = [winner, { ...loser, status: "waitlisted" as const }, other];
    expect(waitlistToReopen(afterWaitlist, "i1")).toEqual([]);
    const afterCancel = [{ ...winner, status: "cancelled" as const }, afterWaitlist[1], other];
    expect(waitlistToReopen(afterCancel, "i1")).toEqual(["l"]);
  });
});

describe("overdue loans keep the item locked", () => {
  it("blocks dates through today until the item is returned", () => {
    const overdue = [req({ status: "active", from: "2026-10-28", until: "2026-11-02" })];
    expect(findConflict(overdue, "i1", "2026-11-04", "2026-11-05", undefined, TODAY)?.id).toBe("r1");
    expect(findConflict(overdue, "i1", "2026-11-04", "2026-11-05")).toBeUndefined();
    expect(findConflict(overdue, "i1", "2026-11-05", "2026-11-06", undefined, TODAY)).toBeUndefined();
  });
});

describe("matching", () => {
  const base = { lat: 8.7139, lon: 77.7567, ownerTrust: 80, requests: [] as BorrowRequest[], today: TODAY };
  it("scores with a transparent breakdown that sums to the total", () => {
    const m = matchItem(item(), { ...base, category: "Tools", from: "2026-11-10", until: "2026-11-12" });
    expect(m.parts.reduce((s, p) => s + p.points, 0)).toBe(m.score);
    expect(m.score).toBeGreaterThan(90);
    expect(m.eligible).toBe(true);
  });
  it("marks reserved dates as ineligible and lowers the date component", () => {
    const m = matchItem(item(), { ...base, category: "Tools", from: "2026-11-10", until: "2026-11-12", requests: [req({ status: "approved" })] });
    expect(m.eligible).toBe(false);
    expect(m.parts.find((p) => p.key === "dates")?.points).toBe(0);
  });
  it("ranks higher-trust, closer owners higher", () => {
    const hi = matchItem(item(), { ...base, ownerTrust: 95 });
    const lo = matchItem(item({ lat: 8.8, lon: 77.8 }), { ...base, ownerTrust: 40 });
    expect(hi.score).toBeGreaterThan(lo.score);
  });
});

describe("fair request ranking", () => {
  const input = (id: string, o: Record<string, unknown> = {}) => ({
    request: req({ id, submittedAt: "2026-11-04T08:00:00Z", ...(o.req as object) }),
    matchScore: 80, borrowerTrust: 60, successfulBorrows: 0, previousDenials: 0, ...(o as object),
  });
  it("is not first-come-first-served: an urgent, trusted late request can outrank an early one", () => {
    const ranked = rankCompetingRequests([
      input("early", { req: { urgency: "low" }, borrowerTrust: 50 }),
      input("late", { req: { submittedAt: "2026-11-04T20:00:00Z", urgency: "urgent" }, borrowerTrust: 85 }),
    ]);
    expect(ranked[0].request.id).toBe("late");
    expect(ranked[0].why).toMatch(/Priority/);
  });
  it("gives a fairness boost for past denials and is deterministic on ties", () => {
    const ranked = rankCompetingRequests([input("b"), input("a")]);
    expect(ranked.map((r) => r.request.id)).toEqual(["a", "b"]);
    const boosted = rankCompetingRequests([input("a"), input("b", { previousDenials: 2 })]);
    expect(boosted[0].request.id).toBe("b");
  });
  it("breakdown parts add up to the total and never exceed 100", () => {
    const [r] = rankCompetingRequests([input("x", { matchScore: 100, borrowerTrust: 100, successfulBorrows: 9, previousDenials: 9, req: { urgency: "urgent" } })]);
    expect(r.priority.parts.reduce((s, p) => s + p.points, 0)).toBe(r.priority.total);
    expect(r.priority.total).toBeLessThanOrEqual(100);
  });
});

describe("trust", () => {
  const ev = (kind: TrustEvent["kind"], delta: number, refId?: string): TrustEvent => ({ id: Math.random().toString(), userId: "u", kind, delta, date: TODAY, note: "", refId });
  it("starts at 50 and follows the published rules", () => {
    expect(summarizeTrust([]).score).toBe(50);
    const s = summarizeTrust([ev("on_time_return", 4), ev("late_return", -9), ev("feedback", 4, "f:5"), ev("cancellation", -1)]);
    expect(s.score).toBe(48);
    expect(s).toMatchObject({ successfulReturns: 1, lateReturns: 1, cancellations: 1, feedbackAvg: 5 });
  });
  it("clamps to 0-100", () => {
    expect(summarizeTrust(Array.from({ length: 30 }, () => ev("early_return", 5))).score).toBe(100);
    expect(summarizeTrust(Array.from({ length: 30 }, () => ev("escalation", -10))).score).toBe(0);
  });
});

describe("overdue management", () => {
  const s = DEFAULT_SETTINGS;
  const at = (until: string, today = TODAY) => overdueStatus(req({ status: "active", until }), today, s);
  it("moves through reminder, due, notice, warning, escalated and suspended", () => {
    expect(at("2026-11-10").stage).toBe("upcoming");
    expect(at("2026-11-06").stage).toBe("reminder");
    expect(at("2026-11-04").stage).toBe("due_today");
    expect(at("2026-11-03").stage).toBe("notice");
    expect(at("2026-11-01").stage).toBe("warning");
    expect(at("2026-10-27").stage).toBe("escalated");
    expect(at("2026-10-20").stage).toBe("suspended");
  });
  it("calculates configurable penalties with a cap and grace period", () => {
    expect(latePenalty(0, s)).toBe(0);
    expect(latePenalty(1, s)).toBe(7);
    expect(latePenalty(30, s)).toBe(20);
    expect(latePenalty(2, { ...s, graceDays: 2 })).toBe(0);
    expect(latePenalty(1, { ...s, trustPenaltyPerDay: 5 })).toBe(10);
  });
});

describe("alternatives", () => {
  it("recommends free, nearby items in the same or related category, best first", () => {
    const wanted = item({ id: "w" });
    const items = [
      wanted,
      item({ id: "same-near", ownerId: "o2" }),
      item({ id: "same-far", ownerId: "o3", lat: 8.85, lon: 77.9 }),
      item({ id: "related", ownerId: "o4", category: "Garden" }),
      item({ id: "other-cat", ownerId: "o5", category: "Kitchen" }),
      item({ id: "booked", ownerId: "o6" }),
      item({ id: "own", ownerId: "b1" }),
    ];
    const requests = [req({ itemId: "w", status: "approved" }), req({ id: "x", itemId: "booked", status: "approved" })];
    const alts = findAlternatives({ wanted, from: "2026-11-10", until: "2026-11-12", borrower: user, items, requests, trustByUser: () => 70, today: TODAY, limit: 5 });
    const ids = alts.map((a) => a.item.id);
    expect(ids[0]).toBe("same-near");
    expect(ids).toContain("related");
    expect(ids).not.toContain("booked");
    expect(ids).not.toContain("own");
    expect(ids).not.toContain("other-cat");
    expect(ids).not.toContain("w");
  });
});

describe("impact estimates", () => {
  it("counts only returned loans toward savings and labels results as estimates", () => {
    const items = [item(), item({ id: "i2", category: "Electronics", estValue: 8000 })];
    const rs = [req({ status: "returned" }), req({ id: "r2", itemId: "i2", status: "returned" }), req({ id: "r3", status: "pending" })];
    const imp = estimateImpact(items, rs);
    expect(imp.completedLoans).toBe(2);
    expect(imp.moneySavedInr).toBe(3000);
    expect(imp.estimated).toBe(true);
    expect(imp.co2AvoidedKg).toBeGreaterThan(0);
  });
});
