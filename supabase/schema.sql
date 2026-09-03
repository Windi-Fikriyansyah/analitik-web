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

-- ---------------------------------------------------------
-- AI REPORTS
-- ---------------------------------------------------------
create table if not exists ai_reports (
  id                uuid primary key default gen_random_uuid(),
  site_id           uuid not null references sites(id) on delete cascade,
  conversion_score  numeric not null,
  summary           text not null,
  insights          jsonb not null default '[]'::jsonb,
  recommendations   jsonb not null default '[]'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists idx_ai_reports_site on ai_reports(site_id);

alter table ai_reports enable row level security;

create policy "owners read own ai_reports" on ai_reports
  for select
  using (exists (select 1 from sites s where s.id = ai_reports.site_id and s.owner_id = auth.uid()));

create policy "owners insert own ai_reports" on ai_reports
  for insert
  with check (exists (select 1 from sites s where s.id = ai_reports.site_id and s.owner_id = auth.uid()));

-- ---------------------------------------------------------
-- USER SUBSCRIPTIONS (Billing & Limits) - Fase 1
-- ---------------------------------------------------------
create table if not exists user_subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  plan_name              text not null default 'Free' check (plan_name in ('Free', 'Starter', 'Growth', 'Business', 'Pro')),
  monthly_visitor_count  int not null default 0,
  billing_cycle_start    timestamptz not null default now(),
  billing_cycle_end      timestamptz not null default now() + interval '1 month',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table user_subscriptions enable row level security;

-- Users can only read their own subscription
create policy "users read own subscription" on user_subscriptions
  for select
  using (auth.uid() = user_id);

-- Trigger to auto-create a 'Free' subscription when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_subscriptions (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Re-create the trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- TRIGGER: Increment Monthly Visitor Count
-- ---------------------------------------------------------
create or replace function public.increment_monthly_visitor()
returns trigger as $$
begin
  update public.user_subscriptions
  set monthly_visitor_count = monthly_visitor_count + 1
  where user_id = (select owner_id from public.sites where id = new.site_id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_visitor_created on visitors;
create trigger on_visitor_created
  after insert on visitors
  for each row execute procedure public.increment_monthly_visitor();

-- ---------------------------------------------------------
-- AUTOMATED DATA RETENTION (Fase 2)
-- ---------------------------------------------------------
create extension if not exists pg_cron;

create or replace function public.delete_old_tracking_data()
returns void as $$
declare
  retention_days int;
  sub record;
begin
  -- Loop through all active subscriptions
  for sub in (select user_id, plan_name from public.user_subscriptions) loop
    -- Determine retention days based on plan
    retention_days := case sub.plan_name
      when 'Free' then 7
      when 'Starter' then 30
      when 'Growth' then 90
      when 'Business' then 180
      when 'Pro' then 365
      else 7 -- default fallback
    end;

    -- Delete old button_clicks
    delete from public.button_clicks bc
    using public.sites s
    where bc.site_id = s.id 
      and s.owner_id = sub.user_id
      and bc.created_at < now() - (retention_days || ' days')::interval;

    -- Delete old section_views
    delete from public.section_views sv
    using public.sites s
    where sv.site_id = s.id 
      and s.owner_id = sub.user_id
      and sv.created_at < now() - (retention_days || ' days')::interval;

    -- Delete old sessions
    delete from public.sessions sess
    using public.sites s
    where sess.site_id = s.id 
      and s.owner_id = sub.user_id
      and sess.created_at < now() - (retention_days || ' days')::interval;

    -- Delete old visitors
    delete from public.visitors v
    using public.sites s
    where v.site_id = s.id 
      and s.owner_id = sub.user_id
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

-- ---------------------------------------------------------
-- HEATMAP CLICKS. one row per general click for heatmap
-- ---------------------------------------------------------
create table if not exists heatmap_clicks (
  id                bigint generated always as identity primary key,
  site_id           uuid not null references sites(id) on delete cascade,
  session_id        uuid not null references sessions(id) on delete cascade,
  visitor_id        uuid not null references visitors(id) on delete cascade,
  page_url          text not null,
  x_position        int not null,
  y_position        int not null,
  screen_width      int not null,
  clicked_at        timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
create index if not exists idx_heatmap_clicks_site on heatmap_clicks(site_id);
create index if not exists idx_heatmap_clicks_session on heatmap_clicks(session_id);

alter table heatmap_clicks enable row level security;

create policy "owners read own heatmap_clicks" on heatmap_clicks
  for select
  using (exists (select 1 from sites s where s.id = heatmap_clicks.site_id and s.owner_id = auth.uid()));

-- ---------------------------------------------------------
-- USER SUBSCRIPTIONS (Billing & Limits) - Fase 1
-- ---------------------------------------------------------
create table if not exists user_subscriptions (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  plan_name              text not null default 'Free' check (plan_name in ('Free', 'Starter', 'Growth', 'Business', 'Pro')),
  monthly_visitor_count  int not null default 0,
  monthly_ai_analysis_count int not null default 0,
  billing_cycle_start    timestamptz not null default now(),
  billing_cycle_end      timestamptz not null default now() + interval '1 month',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table user_subscriptions enable row level security;

-- Users can only read their own subscription
create policy "users read own subscription" on user_subscriptions
  for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------
-- INVOICES (Billing & Payments) - Fase 5
-- ---------------------------------------------------------
create table if not exists invoices (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  plan_name         text not null,
  amount            numeric not null,
  status            text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'canceled')),
  payment_method    text,
  payment_number    text,
  checkout_url      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table invoices enable row level security;

create policy "users read own invoices" on invoices
  for select
  using (auth.uid() = user_id);

create policy "users can insert invoices" on invoices
  for insert
  with check (auth.uid() = user_id);

-- Trigger to auto-create a 'Free' subscription when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_subscriptions (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Re-create the trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- TRIGGER: Increment Monthly Visitor Count
-- ---------------------------------------------------------
create or replace function public.increment_monthly_visitor()
returns trigger as $$
begin
  update public.user_subscriptions
  set monthly_visitor_count = monthly_visitor_count + 1
  where user_id = (select owner_id from public.sites where id = new.site_id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_visitor_created on visitors;
create trigger on_visitor_created
  after insert on visitors
  for each row execute procedure public.increment_monthly_visitor();

-- ---------------------------------------------------------
-- AUTOMATED DATA RETENTION (Fase 2)
-- ---------------------------------------------------------
create extension if not exists pg_cron;

create or replace function public.delete_old_tracking_data()
returns void as $$
declare
  retention_days int;
  sub record;
begin
  -- Loop through all active subscriptions
  for sub in (select user_id, plan_name from public.user_subscriptions) loop
    -- Determine retention days based on plan
    retention_days := case sub.plan_name
      when 'Free' then 7
      when 'Starter' then 30
      when 'Growth' then 90
      when 'Business' then 180
      when 'Pro' then 365
      else 7 -- default fallback
    end;

    -- Delete old button_clicks
    delete from public.button_clicks bc
    using public.sites s
    where bc.site_id = s.id 
      and s.owner_id = sub.user_id
      and bc.created_at < now() - (retention_days || ' days')::interval;

    -- Delete old heatmap_clicks
    delete from public.heatmap_clicks hc
    using public.sites s
    where hc.site_id = s.id 
      and s.owner_id = sub.user_id
      and hc.created_at < now() - (retention_days || ' days')::interval;

    -- Delete old section_views
    delete from public.section_views sv
    using public.sites s
    where sv.site_id = s.id 
      and s.owner_id = sub.user_id
      and sv.created_at < now() - (retention_days || ' days')::interval;

    -- Delete old sessions
    delete from public.sessions sess
    using public.sites s
    where sess.site_id = s.id 
      and sess.owner_id = sub.user_id
      and sess.created_at < now() - (retention_days || ' days')::interval;

    -- Delete old visitors
    delete from public.visitors v
    using public.sites s
    where v.site_id = s.id 
      and s.owner_id = sub.user_id
      and v.created_at < now() - (retention_days || ' days')::interval;
  end loop;
end;
$$ language plpgsql security definer;

-- Ensure the cron job is scheduled to run every day at midnight (UTC)
select cron.schedule(
  'delete-old-tracking-data-job',
  '0 0 * * *', 
  $$ select public.delete_old_tracking_data(); $$
);

-- ---------------------------------------------------------
-- RPC: Increment AI Analysis Count
-- ---------------------------------------------------------
create or replace function public.increment_ai_analysis(user_id_param uuid)
returns void as $$
begin
  update public.user_subscriptions
  set monthly_ai_analysis_count = monthly_ai_analysis_count + 1
  where user_id = user_id_param;
end;
$$ language plpgsql security definer;
