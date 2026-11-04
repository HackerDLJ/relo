-- Private negotiation messages between an item's owner and one prospective borrower.
create table if not exists public.messages (
  id text primary key,
  thread_id text not null,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on public.messages(thread_id, created_at);
create index if not exists messages_recipient_idx on public.messages(recipient_id);

alter table public.messages enable row level security;

-- Only the two people in the conversation can read it. Nobody else, including other members.
create policy messages_read on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid());
-- The recipient may mark a message read.
create policy messages_update on public.messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
