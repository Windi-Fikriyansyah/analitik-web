-- =========================================================
-- Visitor Tracker SaaS - MVP schema
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- =========================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------
-- SITES (tenants). id = the public "site_id" embedded in tracker.js
-- ---------------------------------------------------------
create table if not exists sites (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  domain      text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_sites_owner on sites(owner_id);

-- ---------------------------------------------------------
-- VISITORS. id generated client-side (tracker.js), no PII stored.
-- ---------------------------------------------------------
create table if not exists visitors (
  id             uuid primary key,
  site_id        uuid not null references sites(id) on delete cascade,
  device_type    text check (device_type in ('mobile','tablet','desktop')),
  os             text,
  browser        text,
  screen_width   int,
  screen_height  int,
  first_seen     timestamptz not null default now(),
  last_seen      timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create index if not exists idx_visitors_site on visitors(site_id);

-- ---------------------------------------------------------
-- SESSIONS. id generated client-side, one row per browser tab/session.
-- ---------------------------------------------------------
create table if not exists sessions (
  id                uuid primary key,
  site_id           uuid not null references sites(id) on delete cascade,
  visitor_id        uuid not null references visitors(id) on delete cascade,
  page_url          text,
  referrer          text,
  started_at        timestamptz not null default now(),
  last_active_at    timestamptz not null default now(),
  ended_at          timestamptz,
  duration_seconds  numeric,
  created_at        timestamptz not null default now()
);
create index if not exists idx_sessions_site on sessions(site_id);
create index if not exists idx_sessions_visitor on sessions(visitor_id);

-- ---------------------------------------------------------
-- SECTION VIEWS. one row per (session, section) "look" detected by
-- IntersectionObserver. A section can be re-entered multiple times;
-- each entry/exit cycle is its own row.
-- ---------------------------------------------------------
create table if not exists section_views (
  id                bigint generated always as identity primary key,
  site_id           uuid not null references sites(id) on delete cascade,
  session_id        uuid not null references sessions(id) on delete cascade,
  visitor_id        uuid not null references visitors(id) on delete cascade,
  section_id        text not null,
  entered_at        timestamptz not null,
  left_at           timestamptz,
  duration_seconds  numeric,
  created_at        timestamptz not null default now()
);
create index if not exists idx_section_views_site on section_views(site_id);
create index if not exists idx_section_views_session on section_views(session_id);
create index if not exists idx_section_views_section on section_views(site_id, section_id);

-- ---------------------------------------------------------
-- Row Level Security: dashboard reads go through the authenticated
-- tenant's Supabase session; ingestion writes go through the server-side
-- service role key (bypasses RLS) after the API has validated site_id.
-- ---------------------------------------------------------
alter table sites enable row level security;
alter table visitors enable row level security;
alter table sessions enable row level security;
alter table section_views enable row level security;

create policy "owners manage own sites" on sites
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "owners read own visitors" on visitors
  for select
  using (exists (select 1 from sites s where s.id = visitors.site_id and s.owner_id = auth.uid()));

create policy "owners read own sessions" on sessions
  for select
  using (exists (select 1 from sites s where s.id = sessions.site_id and s.owner_id = auth.uid()));

create policy "owners read own section_views" on section_views
  for select
  using (exists (select 1 from sites s where s.id = section_views.site_id and s.owner_id = auth.uid()));

-- ---------------------------------------------------------
-- Helper view: per-section aggregates (visitor count, avg duration,
-- avg "journey position" used to order the funnel like the spec example)
-- ---------------------------------------------------------
create or replace view section_stats as
select
  sv.site_id,
  sv.section_id,
  count(distinct sv.visitor_id)                                   as visitor_count,
  round(avg(sv.duration_seconds)::numeric, 1)                     as avg_duration_seconds,
  avg(extract(epoch from sv.entered_at - se.started_at))          as avg_entry_offset_seconds
from section_views sv
join sessions se on se.id = sv.session_id
where sv.duration_seconds is not null
group by sv.site_id, sv.section_id;

-- ---------------------------------------------------------
-- BUTTON CLICKS. one row per button click event
-- ---------------------------------------------------------
create table if not exists button_clicks (
  id                bigint generated always as identity primary key,
  site_id           uuid not null references sites(id) on delete cascade,
  session_id        uuid not null references sessions(id) on delete cascade,
  visitor_id        uuid not null references visitors(id) on delete cascade,
  button_id         text not null,
  clicked_at        timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
create index if not exists idx_button_clicks_site on button_clicks(site_id);
create index if not exists idx_button_clicks_session on button_clicks(session_id);
create index if not exists idx_button_clicks_button on button_clicks(site_id, button_id);

alter table button_clicks enable row level security;

create policy "owners read own button_clicks" on button_clicks
  for select
  using (exists (select 1 from sites s where s.id = button_clicks.site_id and s.owner_id = auth.uid()));
