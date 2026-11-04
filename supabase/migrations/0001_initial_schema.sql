create extension if not exists pgcrypto;
create extension if not exists postgis;

create type public.item_status as enum ('available','reserved','borrowed','unavailable','damaged','lost');
create type public.request_status as enum ('pending','approved','rejected','cancelled','waitlisted');
create type public.loan_status as enum ('active','returned','overdue','damaged','lost');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '',
  category text not null,
  image_urls text[] not null default '{}',
  location geography(point, 4326) not null,
  location_label text,
  available_from date not null,
  available_until date not null,
  requirements text[] not null default '{}',
  status public.item_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (available_until >= available_from)
);

create index items_location_gix on public.items using gist(location);
create index items_category_status_idx on public.items(category, status);

create table public.borrow_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  borrower_id uuid not null references public.profiles(id) on delete cascade,
  requested_from date not null,
  requested_until date not null,
  purpose text not null default '',
  match_score integer not null default 0 check (match_score between 0 and 100),
  status public.request_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  check (requested_until >= requested_from),
  unique(item_id, borrower_id, requested_from, requested_until)
);

create index borrow_requests_item_status_idx on public.borrow_requests(item_id, status);
create index borrow_requests_borrower_idx on public.borrow_requests(borrower_id, submitted_at desc);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  request_id uuid not null unique references public.borrow_requests(id),
  lender_id uuid not null references public.profiles(id),
  borrower_id uuid not null references public.profiles(id),
  due_at timestamptz not null,
  returned_at timestamptz,
  status public.loan_status not null default 'active',
  created_at timestamptz not null default now(),
  check (returned_at is null or returned_at >= created_at)
);

create index loans_due_status_idx on public.loans(status, due_at);

create table public.impact_events (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete set null,
  loan_id uuid references public.loans(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('item_listed','loan_started','loan_returned')),
  estimated_waste_avoided_kg numeric(10,2) not null default 0 check (estimated_waste_avoided_kg >= 0),
  estimated_money_saved numeric(10,2) not null default 0 check (estimated_money_saved >= 0),
  assumptions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.borrow_requests enable row level security;
alter table public.loans enable row level security;
alter table public.impact_events enable row level security;

create policy "Profiles are viewable by authenticated members"
on public.profiles for select to authenticated using (true);
create policy "Members can create their own profile"
on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Members can update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Available items are discoverable"
on public.items for select to authenticated using (status = 'available' or owner_id = (select auth.uid()));
create policy "Owners can create items"
on public.items for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Owners can update their items"
on public.items for update to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners can delete their unborrowed items"
on public.items for delete to authenticated
using (owner_id = (select auth.uid()) and status in ('available','unavailable'));

create policy "Borrowers and item owners can view requests"
on public.borrow_requests for select to authenticated
using (
  borrower_id = (select auth.uid()) or
  exists (select 1 from public.items i where i.id = item_id and i.owner_id = (select auth.uid()))
);
create policy "Borrowers can create requests for others' available items"
on public.borrow_requests for insert to authenticated
with check (
  borrower_id = (select auth.uid()) and
  exists (select 1 from public.items i where i.id = item_id and i.status = 'available' and i.owner_id <> (select auth.uid()))
);
create policy "Borrowers can cancel their pending requests"
on public.borrow_requests for update to authenticated
using (borrower_id = (select auth.uid()) and status = 'pending')
with check (borrower_id = (select auth.uid()) and status in ('pending','cancelled'));

create policy "Loan participants can view loans"
on public.loans for select to authenticated
using (lender_id = (select auth.uid()) or borrower_id = (select auth.uid()));

create policy "Impact events visible to their actor"
on public.impact_events for select to authenticated
using (actor_id = (select auth.uid()));

-- Allocation and loan transitions should be implemented as narrowly scoped,
-- SECURITY INVOKER database functions after the application flow is finalized.
-- Do not approve requests by issuing separate client-side updates: reserve the
-- item and transition the request in one transaction under a row lock.
