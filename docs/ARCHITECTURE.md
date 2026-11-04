# RELO Architecture

## System boundaries

- Web and mobile are presentation clients.
- `packages/core` contains deterministic, platform-independent domain logic.
- Supabase Auth identifies members.
- PostgreSQL is the source of truth for item and loan state.
- Realtime is a UX enhancement; it is not a concurrency-control mechanism.

## Allocation invariant

An item can have at most one active reservation/loan at a time. Approval must be performed in a single database transaction that locks the item row (`SELECT ... FOR UPDATE`), checks current status and requested dates, updates the winning request, and reserves the item. Never trust a client-side availability check.

## Item lifecycle

`available -> reserved -> borrowed -> available`

Exceptional states: `unavailable`, `damaged`, `lost`. A reservation can be released when cancelled or expired. A scheduled process marks loans overdue when `due_at < now()` and the loan remains active.

## Matching

Hard filters first: item status, exact category compatibility, full date-window coverage, and discovery radius. Then score eligible candidates with weighted soft criteria:

- Category: 35%
- Location: 30%
- Availability fit: 20%
- Requirement compatibility: 15%

The score is normalized to 0-100. The UI should show the component breakdown and reasons. The client score is advisory only.

## Fairness

For competing requests, order by:
1. Higher match score
2. Fewer completed borrows (broader access)
3. More prior denials (corrective fairness)
4. Earlier submission time
5. Stable request ID

This is a transparent baseline, not a claim of perfect fairness. The team should test for gaming and consider a per-user cooldown or request quota.

## Security

- RLS enabled on every exposed table.
- No service-role key in browser or mobile bundles.
- Ownership checks must be enforced in database policies and transactional functions.
- Avoid using user-editable profile metadata as authorization claims.
