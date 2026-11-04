# Test Plan and Results

Run on 2026-11-04 against the production build (`next build` then `next start`).

## Automated unit tests: `pnpm test` (Vitest)
19 tests, all passing. Covers date locking and overlap, waitlist transitions, match scoring and breakdown sums, fair ranking
(including non-FCFS and ties), trust rules and bounds, overdue stages and penalties, alternatives, overdue-lock, impact.

## Browser tests: Playwright + Chrome (`apps/web/e2e/`)
Start the app (`pnpm --filter @relo/web build && pnpm --filter @relo/web exec next start -p 3100`), then:
```
python3 apps/web/e2e/smoke.py       # every route, desktop 1280px and mobile 390px, console errors, horizontal overflow
python3 apps/web/e2e/sale.py        # sell + refurbished flow (15 checks)
python3 apps/web/e2e/lifecycle.py   # full workflow
```
- **Smoke:** 13 routes x 2 viewports render; no console errors; no horizontal overflow after the Trust-page fix.
- **Lifecycle:** 24 checks: search and filters; empty state; ranked competing requests with explanation; approve moves
  others to waitlist; locked dates shown; overlap blocked with alternatives and waitlist option; reversed dates rejected;
  listing validation; publish then find via search; persistence after reload; extension approval; late return lowers
  trust (53 to 48); waitlisted request reopens after return; impact estimates labelled; all eight differentiators present.

## Not yet tested
Concurrency across tabs/devices, screen-reader accessibility, real Supabase persistence (not built), notification delivery
(simulated by design), and Safari/Firefox.
