-- Rename the existing email-capture "signups" table to "signin" (it records the
-- top-of-page Sign In emails), then add a fresh "signups" table that records a
-- sign-up's name + email only.

-- 1. Rename existing signups -> signin (data and policies move with the table).
alter table if exists public.signups rename to signin;

-- 2. New signups table: name + email only.
create table if not exists public.signups (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text        not null,
  email       text        not null
);

-- 3. Secure the new table: RLS ON with an anon INSERT-only policy (security rule #3).
alter table public.signups enable row level security;
drop policy if exists "Anyone can sign up" on public.signups;
create policy "Anyone can sign up"
  on public.signups
  for insert
  to anon, authenticated
  with check (true);
