-- =========================================================
-- Migration: Add Zernio Meta Ads Integration Fields
-- Run this in the Supabase SQL Editor:
-- =========================================================

alter table sites 
  add column if not exists zernio_api_key text,
  add column if not exists meta_connected_account jsonb;

-- Comment for documentation
comment on column sites.zernio_api_key is 'Zernio API Key (sk_...) for unified Meta Ads / Social OAuth & API';
comment on column sites.meta_connected_account is 'Cached Meta/Facebook connected account details from Zernio';
