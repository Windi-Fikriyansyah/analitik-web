-- =========================================================
-- Migration: Add Meta Ads Fields (Access Token & Ad Account ID)
-- Run this in the Supabase SQL Editor:
-- =========================================================

alter table sites 
  add column if not exists meta_access_token text,
  add column if not exists meta_ad_account_id text;

-- Comment for documentation
comment on column sites.meta_access_token is 'Meta Graph API User/System User Access Token for Conversions API & Custom Audience';
comment on column sites.meta_ad_account_id is 'Meta Ad Account ID (e.g. act_1234567890 or 1234567890)';
