-- Create the inquiries table (page 3 · "Get Started" inquiry form).
-- Captures the visitor's details plus their home preferences.
-- id (uuid) and created_at (timestamptz) are added automatically.

create table if not exists public.inquiries (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  -- Your details
  first_name      text        not null,
  last_name       text        not null,
  email           text        not null,
  phone           text,
  contact_method  text,                       -- Email / Phone call / Text message / Either is fine

  -- What you're looking for
  pref_home       text,                       -- lot value 1-6 (the chosen home), or null = "not sure yet"
  phase           text,                       -- Any phase / Falcon Ridge · Phase 1..3
  beds            text,                       -- Any / 1+ / 2+ / 3+ / 4+
  budget          text,                       -- budget range bucket
  timeframe       text,                       -- move-in timeframe

  -- Visit and notes
  visit_date      date,
  notes           text,

  -- Consent (the form requires this checkbox before submitting)
  consent         boolean     not null default false
);

-- Security rule #3: RLS is ON for every table.
-- Public inquiry form: anyone (anon key) may INSERT, but no one can
-- SELECT/UPDATE/DELETE through the API. Reading inquiries requires the
-- service role (server-side) or the dashboard, so leads stay private.
alter table public.inquiries enable row level security;

create policy "Anyone can submit an inquiry"
  on public.inquiries
  for insert
  to anon, authenticated
  with check (true);
