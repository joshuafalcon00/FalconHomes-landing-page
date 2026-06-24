-- Create the signups table.
-- id (uuid) and created_at (timestamptz) are added automatically.
-- This migration only adds the three fields the form needs.

create table if not exists public.signups (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text        not null,
  email       text        not null,
  message     text
);

-- Security rule #3: RLS is ON for every table.
-- Public "send a message" form: anyone (anon key) may INSERT, but no one can
-- SELECT/UPDATE/DELETE through the API. Reading rows requires the service role
-- (server-side) or the dashboard, so submissions stay private.
alter table public.signups enable row level security;

create policy "Anyone can send a message"
  on public.signups
  for insert
  to anon, authenticated
  with check (true);
