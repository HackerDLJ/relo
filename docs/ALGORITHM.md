# Matching, Allocation and Trust: Algorithm Decisions

All logic lives in `packages/core/src/engine.ts` as pure functions, so it is unit-testable and
reusable by web, mobile and (later) a database function. Every score returns its own explanation.

## 1. Match score (item vs. a borrower's need), 0-100

| Component | Weight | How it is scored |
|---|---|---|
| Category | 30 | Exact = full; related category (e.g. Tools to Garden) = half; otherwise 0 |
| Distance | 25 | Haversine. Full within 1 km, falling linearly to 0 at the search radius (default 25 km) |
| Dates | 20 | Fraction of requested days that are inside the owner's window and not locked. With no dates, free days in the next 14 |
| Requirements | 10 | Share of the borrower's stated requirements the item offers |
| Owner trust | 15 | Owner trust score / 100 |

An item is *eligible* only if active, within radius and fully free for the requested dates.
Why these weights: category and distance dominate because they decide whether the item is useful at all in a hyperlocal
setting; availability is a hard filter as well as a score so partial matches are shown but never offered as bookable.

## 2. Fair request priority, 0-100

Used when several requests compete for the same item. **Not first-come-first-served.**

| Factor | Max | Rule |
|---|---|---|
| Match score | 30 | 30 x match / 100 |
| Trust score | 25 | 25 x borrower trust / 100 |
| Urgency | 20 | flexible 0, normal 8, urgent 20 |
| Submission time | 10 | 10, minus 1 per 6 h behind the earliest competitor |
| Past successful borrowing | 8 | +2 per returned loan |
| Fairness boost (past declines) | 7 | +2.5 per earlier declined request |

Ties break on earlier submission, then stable request ID, so results are deterministic.
The UI shows each factor's points and a one-line reason ("Why this rank?").

**Known trade-off.** Urgency is self-declared and could be gamed. Mitigations: it is only 20 of 100 points, it never
overrides date locking, and trust (which falls on late returns) carries more weight. A per-user quota on "urgent" requests is the
next step. Note: the original scaffold's `rankRequests` favoured borrowers with *fewer* past borrows (broader access); the new
ranking rewards a reliable track record and compensates past declines instead. The old function is retained, untouched.

## 3. Date locking and double-booking

Only `approved` and `active` requests lock dates (inclusive ranges). Rules enforced in `validateBorrowDates`,
`findConflict` and the approval action:
- start not in the past; end not before start; max 30 days; inside the owner's window; item active;
- no overlap with a locked range. An **overdue active loan keeps the item locked through today** until returned;
- approving re-checks the conflict at decision time; approving one request moves overlapping `pending` requests to `waitlisted`;
- when a lock is released (cancel, return) waitlisted requests that no longer clash return to `pending` keeping their submission time, and borrowers are notified.

**Prototype vs. production.** In the local-first prototype the check and the write happen in one synchronous step, so
double approval is impossible within a browser. In production the same check must run inside a database transaction
with `SELECT ... FOR UPDATE` on the item row (see ARCHITECTURE.md). That is not implemented yet.

## 4. Alternatives when an item is unavailable

Candidates: active items in the same or a related category (`RELATED_CATEGORIES`), not owned by the borrower, within 25 km,
**fully free for the requested dates**. Ranked by match score, then distance, then ID. Shown when a request is declined,
when chosen dates are booked, and on the item page.

## 5. Trust (transparent rules)

Start at 50, clamp 0-100. On-time return +4, early +5, completed lend +3, feedback (stars - 3) x 2,
late return -(5 + 2 per late day after grace), capped at 20 (configurable), late cancellation (<24 h) -6, cancellation -1, escalation -10.
Trust feeds back into matching (15% of match) and request priority (25%).

## 6. Overdue stages

Reminder (2 days before and on the day) to notice (day 1) to final warning (day 3) to escalation (day 7, -10 trust) to
suspension (day 14, new borrowing blocked). All thresholds, the grace period and the penalty are configurable.
Each stage fires once (idempotent sweep). Notifications are in-app and simulated.

## 7. Impact estimates

Counts are exact. Money, waste and CO2e are **estimates**: for each returned loan, assume 25% of borrowers would otherwise
have bought the item new; count that share of replacement value, category weight and category embodied CO2e. The per-category
figures are rough placeholders chosen for the prototype, not lifecycle-assessment data.

## Complexity

Scoring N items is O(N). Ranking K competing requests is O(K log K). Conflict checks are O(R) per item over its R requests.

## Limitations

Straight-line distance (not travel time); category relations are a hand-written table; requirement matching is string inclusion;
trust can be gamed by colluding accounts (no identity verification); no cooldown on repeated cancellations beyond the penalty.
