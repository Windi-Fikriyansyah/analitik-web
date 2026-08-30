import { getSupabaseAdmin } from './supabaseAdmin';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

type CacheEntry = { exists: boolean; expiresAt: number };
const siteCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // re-check every 60s in case a site is deleted

/**
 * Confirms a site_id is a real, existing tenant before we accept any
 * tracking data for it. This is the core of tenant isolation on the
 * ingestion path - every write downstream is scoped to this site_id.
 */
export async function siteExists(siteId: string): Promise<boolean> {
  if (!isValidUuid(siteId)) return false;

  const cached = siteCache.get(siteId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.exists;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('sites')
    .select('id')
    .eq('id', siteId)
    .maybeSingle();

  const exists = !error && !!data;
  siteCache.set(siteId, { exists, expiresAt: Date.now() + CACHE_TTL_MS });
  return exists;
}
