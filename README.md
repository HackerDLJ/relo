# RELO

**Resources deserve another life.** A community resource-sharing platform for discovering, borrowing, and returning underused items.

## Monorepo

- `apps/web`: Next.js web client
- `apps/mobile`: Expo / React Native client
- `packages/core`: shared matching and allocation logic
- `supabase/migrations`: PostgreSQL schema and row-level security
- `docs`: architecture and engineering decisions

## Prerequisites

- Node.js 20+
- pnpm 9+
- Expo Go or an iOS/Android simulator
- A Supabase project for authentication, database, realtime, and storage

## Local setup

```bash
corepack enable
pnpm install
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev:web
```

In a second terminal:

```bash
pnpm dev:mobile
```

Configure `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` using your Supabase project settings. Never put a service-role key in either client.

## Current implementation status (v0.2)

`apps/web` is a working, local-first prototype: all 12 modules (discover, two-way matching, listings, needs and offers,
borrowing lifecycle, fair ranking and waitlist, alternatives, extensions, overdue management, trust, impact, and the
"What RELO Does Differently" page). Data is demo seed data persisted in the browser (localStorage); notifications and
moderation are simulated. **There is no server-side persistence yet.** The Supabase schema in `supabase/` is not wired in.

See `docs/ALGORITHM.md`, `docs/EDGE_CASES.md` and `docs/TESTING.md`.

## Deploying to Vercel

The prototype needs no environment variables or backend.
1. Import `HackerDLJ/relo` in Vercel.
2. **Recommended:** set *Root Directory* to `apps/web` (standard monorepo setup, installs from the workspace root).
   Alternative: leave Root Directory empty; the root `vercel.json` installs only the web workspace and builds `@relo/web`.
3. Deploy. Production builds were rehearsed from a clean checkout (`pnpm install --frozen-lockfile --filter @relo/web...`, then `pnpm --filter @relo/web build`).

## Scripts

- `pnpm dev:web` - start the web app
- `pnpm dev:mobile` - start Expo
- `pnpm test` - run shared-core tests
- `pnpm typecheck` - type-check workspaces

## Product workflow

1. Lender creates an item listing and sets its availability window.
2. Borrower searches and submits a request with a requested date range and purpose.
3. RELO filters hard constraints, ranks eligible items, and explains each score.
4. Lender reviews requests and approves one request.
5. Approval must be atomic: lock the item row, verify it is still available, reserve it, and transition the request.
6. Handover starts a loan; return closes the loan and restores item availability if no block remains.
7. Scheduled jobs flag overdue loans and refresh impact estimates.

## Important

The client-side scoring function is for discovery and explanation, not authorization. Availability and allocation must always be revalidated by the database at approval time.
