-- RELO schema. Run once in the Supabase SQL editor (or `supabase db push`).
-- Each table keeps relational columns that RLS and constraints need, plus the
-- full record as jsonb `data` (same shape the shared engine in @relo/core uses).

create extension if not exists btree_gist;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists items_owner_idx on public.items(owner_id);

create table if not exists public.requests (
  id text primary key,
  item_id text not null references public.items(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  status text not null,
  from_d date not null,
  until_d date not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  check (until_d >= from_d),
  -- Hard guarantee against double-booking: two approved/active loans of the
  -- same item can never overlap, even under concurrent requests.
  constraint no_double_booking exclude using gist (
    item_id with =,
    daterange(from_d, until_d, '[]') with &&
  ) where (status in ('approved', 'active'))
);
create index if not exists requests_item_idx on public.requests(item_id);
create index if not exists requests_borrower_idx on public.requests(borrower_id);

create table if not exists public.needs (
  id text primary key,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id text primary key,
  need_id text not null references public.needs(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trust_events (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists trust_user_idx on public.trust_events(user_id);

create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists notif_user_idx on public.notifications(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.requests enable row level security;
alter table public.needs enable row level security;
alter table public.offers enable row level security;
alter table public.trust_events enable row level security;
alter table public.notifications enable row level security;

-- Profiles: everyone signed in can see neighbours; you edit only your own.
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Items: public to members, owner-only writes.
create policy items_read on public.items for select to authenticated using (true);
create policy items_insert on public.items for insert to authenticated with check (owner_id = auth.uid());
create policy items_update on public.items for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy items_delete on public.items for delete to authenticated using (owner_id = auth.uid());

-- Requests: readable by members (needed to show locked dates and rank fairly);
-- created by the borrower; changed by the borrower or the item's owner.
create policy requests_read on public.requests for select to authenticated using (true);
create policy requests_insert on public.requests for insert to authenticated with check (borrower_id = auth.uid());
create policy requests_update on public.requests for update to authenticated
  using (borrower_id = auth.uid() or exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()))
  with check (borrower_id = auth.uid() or exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()));

-- Needs and offers.
create policy needs_read on public.needs for select to authenticated using (true);
create policy needs_insert on public.needs for insert to authenticated with check (borrower_id = auth.uid());
create policy needs_update on public.needs for update to authenticated
  using (borrower_id = auth.uid() or exists (select 1 from public.requests r where r.data->>'needId' = needs.id and r.borrower_id = auth.uid()) or exists (select 1 from public.items i join public.requests r on r.item_id = i.id where r.data->>'needId' = needs.id and i.owner_id = auth.uid()))
  with check (true);
create policy offers_read on public.offers for select to authenticated using (true);
create policy offers_insert on public.offers for insert to authenticated with check (owner_id = auth.uid());
create policy offers_update on public.offers for update to authenticated
  using (owner_id = auth.uid() or exists (select 1 from public.needs n where n.id = need_id and n.borrower_id = auth.uid()))
  with check (true);

-- Trust events are public (transparent reputation). Members may add events;
-- nobody can edit or delete them. See docs/SECURITY.md for the known limitation.
create policy trust_read on public.trust_events for select to authenticated using (true);
create policy trust_insert on public.trust_events for insert to authenticated with check (true);

-- Notifications: private to the recipient; anyone signed in may send one.
create policy notif_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notif_insert on public.notifications for insert to authenticated with check (true);
create policy notif_update on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
