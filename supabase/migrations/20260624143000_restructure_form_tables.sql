-- Restructure the form tables into the final 3-table layout.
--
-- NOTE ON SECURITY: Row Level Security is DISABLED on all three tables for now,
-- explicitly permitted by the project owner. This is a temporary state — before
-- any real launch, re-enable RLS (security rule #3) with anon INSERT-only policies.
-- Each table keeps an insert policy defined below so re-enabling is just flipping
-- RLS back on.

-- 1. Rename the original "send a message" table: signups -> messages.
--    (Bottom of page 1: records Name, Email, Message.)
alter table if exists public.signups rename to messages;

-- 2. New signups table: the "Sign In" entry at the top of page 1. Email only.
create table if not exists public.signups (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text        not null
);

-- Insert policy for the new signups table (inert while RLS is disabled, ready for re-enable).
drop policy if exists "Anyone can sign up" on public.signups;
create policy "Anyone can sign up"
  on public.signups
  for insert
  to anon, authenticated
  with check (true);

-- 3. Disable RLS on all three tables for now (owner-permitted).
alter table public.signups   disable row level security;
alter table public.messages  disable row level security;
alter table public.inquiries disable row level security;
