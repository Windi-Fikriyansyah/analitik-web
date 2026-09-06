-- =========================================================
-- MIGRATION: TRACK EVENTS TABLE FOR FONNTE WHATSAPP WEBHOOK
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lonpbqrsqaecxsrconsb/sql
-- =========================================================

create extension if not exists "pgcrypto";

create table if not exists track_events (
  id                uuid primary key default gen_random_uuid(),
  site_id           uuid not null references sites(id) on delete cascade,
  phone_number      text not null,
  sender_name       text,
  event_name        text not null default 'whatsapp_chat',
  message           text,
  device_number     text,
  status            text default 'received',
  metadata          jsonb default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists idx_track_events_site on track_events(site_id);
create index if not exists idx_track_events_phone on track_events(site_id, phone_number);
create index if not exists idx_track_events_created on track_events(site_id, created_at desc);

alter table track_events enable row level security;

-- Drop existing policies if re-running
drop policy if exists "owners read own track_events" on track_events;
drop policy if exists "owners delete own track_events" on track_events;

create policy "owners read own track_events" on track_events
  for select
  using (exists (select 1 from sites s where s.id = track_events.site_id and s.owner_id = auth.uid()));

create policy "owners delete own track_events" on track_events
  for delete
  using (exists (select 1 from sites s where s.id = track_events.site_id and s.owner_id = auth.uid()));
