-- Online payments (Razorpay). Rows are written only by the server with the service-role key
-- after a payment signature is verified. Signed-in users can read payments they are part of.
create table if not exists public.payments (
  id text primary key,
  kind text not null check (kind in ('sale', 'rent')),
  item_id text not null,
  request_id text,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  razorpay_order_id text not null,
  razorpay_payment_id text not null unique,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists payments_buyer_idx on public.payments(buyer_id);
create index if not exists payments_seller_idx on public.payments(seller_id);
alter table public.payments enable row level security;
create policy payments_read on public.payments for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());
-- No insert, update or delete policy: only the service role (server) can write.
